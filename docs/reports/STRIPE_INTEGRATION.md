# Stripe Connect Integration Guide

## Overview
EchoChat uses Stripe Connect to enable peer-to-peer money transfers between users.

## Setup Instructions

### 1. Get Stripe Account
1. Sign up at https://stripe.com
2. Get your API keys from the Dashboard → Developers → API keys
3. You'll need:
   - **Publishable Key** (starts with `pk_`) - safe for frontend
   - **Secret Key** (starts with `sk_`) - **NEVER expose in frontend code**

### 2. Environment Variables
Add to your `.env` file:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. Backend API Required
The frontend payment service requires a backend API with these endpoints:

#### POST `/api/stripe/create-account`
Creates a Stripe Connect account for a user
```json
Request: {
  "userId": "user123",
  "email": "user@example.com"
}
Response: {
  "accountId": "acct_xxx",
  "onboardingUrl": "https://connect.stripe.com/...",
  "chargesEnabled": false
}
```

#### GET `/api/stripe/account-status/:userId`
Gets the status of a user's Stripe Connect account
```json
Response: {
  "accountId": "acct_xxx",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "requirements": {
    "currentlyDue": [],
    "eventuallyDue": []
  }
}
```

#### POST `/api/stripe/create-payment-intent`
Creates a payment intent for sending money
```json
Request: {
  "amount": 5000,  // in cents
  "recipientAccountId": "acct_xxx",
  "metadata": {
    "senderId": "user123",
    "recipientId": "user456",
    "note": "Payment note"
  }
}
Response: {
  "id": "pi_xxx",
  "client_secret": "pi_xxx_secret_xxx",
  "amount": 5000,
  "status": "requires_payment_method"
}
```

#### POST `/api/stripe/transfer`
Transfers money to a connected account
```json
Request: {
  "amount": 5000,  // in cents
  "destination": "acct_xxx",
  "metadata": {
    "transactionId": "txn_xxx"
  }
}
Response: {
  "id": "tr_xxx",
  "amount": 5000,
  "destination": "acct_xxx",
  "status": "paid"
}
```

#### GET `/api/stripe/transactions/:userId`
Gets transaction history for a user
```json
Response: {
  "transactions": [
    {
      "id": "txn_xxx",
      "type": "sent",  // or "received"
      "amount": 50.00,
      "recipient": "user456",
      "status": "completed",
      "timestamp": 1234567890
    }
  ]
}
```

## Backend Implementation Example (Node.js/Express)

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Connect account
app.post('/api/stripe/create-account', async (req, res) => {
  const { userId, email } = req.body;
  
  const account = await stripe.accounts.create({
    type: 'express',
    email: email,
    metadata: { userId }
  });
  
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://yourapp.com/reauth',
    return_url: 'https://yourapp.com/return',
    type: 'account_onboarding',
  });
  
  res.json({
    accountId: account.id,
    onboardingUrl: accountLink.url,
    chargesEnabled: account.charges_enabled
  });
});

// Create payment intent
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  const { amount, recipientAccountId, metadata } = req.body;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    application_fee_amount: Math.round(amount * 0.029 + 30), // 2.9% + $0.30
    transfer_data: {
      destination: recipientAccountId,
    },
    metadata: metadata
  });
  
  res.json({
    id: paymentIntent.id,
    client_secret: paymentIntent.client_secret,
    amount: paymentIntent.amount,
    status: paymentIntent.status
  });
});
```

## Security Notes
1. **Never expose secret keys** in frontend code
2. All operations with secret keys must be done on the backend
3. Use HTTPS in production
4. Implement rate limiting on payment endpoints
5. Validate all amounts and user permissions server-side
6. Implement fraud detection and monitoring

## Testing
Use Stripe test mode:
- Test cards: https://stripe.com/docs/testing
- Use `pk_test_` keys for development
- Use `sk_test_` keys on backend

## Production Checklist
- [ ] Set up Stripe webhooks for payment events
- [ ] Implement proper error handling
- [ ] Add transaction logging
- [ ] Set up fraud monitoring
- [ ] Implement proper KYC/AML checks if required
- [ ] Get money transmitter license if required
- [ ] Implement PCI DSS compliance
- [ ] Set up proper security headers
- [ ] Enable Stripe Radar for fraud detection



