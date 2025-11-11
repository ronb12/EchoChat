# Twilio Integration Guide for EchoChat

## Overview

Twilio provides cloud communications APIs for SMS, voice calls, and phone numbers. This guide shows how to integrate Twilio for:
- **Free phone numbers** (Twilio trial account includes free phone number)
- **SMS verification** (2FA codes)
- **Voice calls** (if needed)
- **WhatsApp messaging** (optional)

---

## 🎯 Use Cases

### 1. Two-Factor Authentication (2FA) via SMS
Replace the current 2FA implementation with real SMS sending via Twilio.

### 2. Phone Number Verification
Allow users to verify their phone numbers using SMS codes.

### 3. Free Phone Numbers
- Twilio provides **free trial phone numbers**
- Free tier: $15.50 credit (enough for ~1000 SMS messages)
- Pricing: ~$0.0075 per SMS (very affordable)

---

## 📋 Step 1: Get Twilio Account

1. **Sign up for Twilio**: https://www.twilio.com/try-twilio
2. **Get your credentials**:
   - Account SID
   - Auth Token
   - Phone Number (free trial number provided)

3. **Free Trial Includes**:
   - $15.50 credit
   - 1 free phone number
   - Can send SMS to verified numbers only (during trial)

---

## 📦 Step 2: Install Twilio SDK

```bash
npm install twilio
```

---

## 🔧 Step 3: Backend Integration (Firebase Functions)

### Create Twilio Service

**File: `functions/src/services/twilioService.js`**

```javascript
const twilio = require('twilio');

class TwilioService {
  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.warn('⚠️  Twilio credentials not configured');
      this.client = null;
    } else {
      this.client = twilio(accountSid, authToken);
    }
  }

  /**
   * Send SMS message
   * @param {string} to - Phone number to send to (E.164 format: +1234567890)
   * @param {string} message - Message text
   * @returns {Promise}
   */
  async sendSMS(to, message) {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    
    try {
      const result = await this.client.messages.create({
        body: message,
        from: twilioNumber,
        to: to
      });
      
      return {
        success: true,
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw error;
    }
  }

  /**
   * Send 2FA verification code
   * @param {string} phoneNumber - User's phone number
   * @param {string} code - 6-digit verification code
   * @returns {Promise}
   */
  async send2FACode(phoneNumber, code) {
    const message = `Your EchoChat verification code is: ${code}\n\nThis code will expire in 10 minutes.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Verify phone number (send verification code)
   * @param {string} phoneNumber - Phone number to verify
   * @returns {Promise<{code: string, expiresAt: number}>}
   */
  async sendPhoneVerification(phoneNumber) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.send2FACode(phoneNumber, code);
    
    return {
      code, // In production, hash this before storing
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
  }
}

module.exports = new TwilioService();
```

---

## 🔧 Step 4: Update Firebase Functions

### Add Twilio Endpoints

**File: `functions/index.js`** (add to existing Express app)

```javascript
const twilioService = require('./services/twilioService');

// Send 2FA code via SMS
app.post('/api/twilio/send-2fa', async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;
    
    if (!userId || !phoneNumber) {
      return res.status(400).json({ error: 'Missing userId or phoneNumber' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Send SMS via Twilio
    await twilioService.send2FACode(phoneNumber, code);
    
    // Store code hash in Firestore (hash for security)
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    await admin.firestore().collection('twoFactorCodes').doc(userId).set({
      codeHash,
      phoneNumber,
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Error sending 2FA code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify phone number
app.post('/api/twilio/verify-phone', async (req, res) => {
  try {
    const { userId, phoneNumber, code } = req.body;
    
    if (!userId || !phoneNumber || !code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get stored code hash
    const codeDoc = await admin.firestore()
      .collection('twoFactorCodes')
      .doc(userId)
      .get();

    if (!codeDoc.exists) {
      return res.status(404).json({ error: 'Verification code not found' });
    }

    const data = codeDoc.data();
    
    // Check expiration
    if (data.expiresAt.toMillis() < Date.now()) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    // Verify code
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    if (codeHash !== data.codeHash) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Update user's verified phone number
    await admin.firestore().collection('users').doc(userId).update({
      phoneNumber: phoneNumber,
      phoneVerified: true,
      phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Delete code
    await admin.firestore().collection('twoFactorCodes').doc(userId).delete();

    res.json({ success: true, message: 'Phone number verified' });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ error: 'Failed to verify phone number' });
  }
});
```

---

## 🔐 Step 5: Set Environment Variables

### Firebase Functions Config

```bash
# Set Twilio credentials in Firebase Functions
firebase functions:config:set \
  twilio.account_sid="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  twilio.auth_token="your_auth_token_here" \
  twilio.phone_number="+1234567890"
```

### Or use .env file (functions/.env)

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 📱 Step 6: Update Frontend (2FA)

### Update twoFactorService.js

**File: `src/services/twoFactorService.js`**

```javascript
// Replace send2FACode method
async send2FACode(userId, phoneNumber, email) {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    
    // Call backend API to send SMS via Twilio
    const response = await fetch(`${API_BASE_URL}/api/twilio/send-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        phoneNumber
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send verification code');
    }

    const result = await response.json();
    return { success: true };
  } catch (error) {
    console.error('Error sending 2FA code:', error);
    throw error;
  }
}
```

---

## 💰 Pricing (Free Tier)

### Twilio Free Trial
- **Free Credit**: $15.50
- **Free Phone Number**: 1 (trial number)
- **SMS Cost**: ~$0.0075 per message
- **Approximate Messages**: ~2,000 SMS with free credit

### After Free Trial
- **SMS**: ~$0.0075 per message (US)
- **Phone Number**: ~$1/month
- **Very affordable** for most apps

---

## 🎯 Use Cases

### 1. Two-Factor Authentication
```javascript
// User enables 2FA
// Enter phone number
// Twilio sends SMS with code
// User enters code
// Phone number verified
```

### 2. Phone Number Verification
```javascript
// User wants to add phone number to profile
// Enter phone number
// Twilio sends verification code
// Enter code to verify
// Phone number saved to profile
```

### 3. Password Reset via SMS
```javascript
// User forgets password
// Enter phone number
// Twilio sends reset code
// Enter code to reset password
```

---

## 🔒 Security Best Practices

1. **Never store verification codes in plaintext**
   - Always hash codes before storing
   - Use SHA-256 or stronger

2. **Set expiration times**
   - Codes expire after 10 minutes
   - Delete expired codes

3. **Rate limiting**
   - Limit SMS requests per user
   - Prevent abuse

4. **Phone number validation**
   - Validate E.164 format (+1234567890)
   - Use Twilio's Lookup API to verify numbers

---

## 📝 Example: Complete 2FA Flow

```javascript
// Frontend: Enable 2FA
const enable2FA = async (phoneNumber) => {
  // 1. Send verification code via Twilio
  await fetch('/api/twilio/send-2fa', {
    method: 'POST',
    body: JSON.stringify({ userId, phoneNumber })
  });
  
  // 2. User enters code
  const code = prompt('Enter 6-digit code');
  
  // 3. Verify code
  const response = await fetch('/api/twilio/verify-phone', {
    method: 'POST',
    body: JSON.stringify({ userId, phoneNumber, code })
  });
  
  // 4. 2FA enabled!
};
```

---

## 🚀 Deployment

### 1. Install Twilio in Functions
```bash
cd functions
npm install twilio
```

### 2. Set Environment Variables
```bash
firebase functions:config:set twilio.account_sid="..." twilio.auth_token="..." twilio.phone_number="..."
```

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

---

## ✅ Testing

### Test SMS Sending
```javascript
// In Firebase Functions console
const twilioService = require('./services/twilioService');
await twilioService.sendSMS('+1234567890', 'Test message');
```

### Test from Frontend
```javascript
// Open browser console
fetch('/api/twilio/send-2fa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user',
    phoneNumber: '+1234567890'
  })
});
```

---

## 📚 Additional Resources

- **Twilio Documentation**: https://www.twilio.com/docs
- **SMS API**: https://www.twilio.com/docs/sms
- **Phone Numbers**: https://www.twilio.com/docs/phone-numbers
- **Free Trial**: https://www.twilio.com/try-twilio

---

## 🎉 Summary

✅ **Free Phone Numbers**: Twilio provides free trial phone numbers  
✅ **Affordable**: ~$0.0075 per SMS after trial  
✅ **Easy Integration**: Simple API, well-documented  
✅ **Secure**: Built-in verification, rate limiting  
✅ **Production Ready**: Used by millions of apps  

Your app can now send real SMS messages for 2FA, phone verification, and more!


