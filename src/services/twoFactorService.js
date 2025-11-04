// Two-Factor Authentication Service
import { auth, db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { RecaptchaVerifier } from 'firebase/auth';
import CryptoJS from 'crypto-js';

class TwoFactorService {
  constructor() {
    this.verifier = null;
    this.confirmationResult = null;
  }

  // Initialize reCAPTCHA verifier
  initializeVerifier() {
    if (!this.verifier && typeof window !== 'undefined' && window.recaptchaVerifier === undefined) {
      this.verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
      window.recaptchaVerifier = this.verifier;
    }
    return this.verifier || window.recaptchaVerifier;
  }

  // Generate 6-digit code
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send 2FA code via SMS (or email fallback)
  async send2FACode(userId, phoneNumber, email) {
    try {
      // Store code in Firestore (in production, use a secure service like Twilio)
      const code = this.generateCode();
      const codeHash = CryptoJS.SHA256(code).toString();

      // Store hashed code
      const codeRef = doc(db, 'twoFactorCodes', userId);
      await setDoc(codeRef, {
        codeHash,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        phoneNumber,
        email,
        createdAt: Date.now()
      }, { merge: true });

      // In production, send SMS via Twilio or email
      // For now, show alert (in production, send actual SMS/email)
      alert(`2FA Code (dev only): ${code}\nIn production, this would be sent via SMS/Email.`);

      return { success: true, code }; // Remove code in production
    } catch (error) {
      console.error('Error sending 2FA code:', error);
      throw error;
    }
  }

  // Verify 2FA code
  async verify2FACode(userId, code) {
    try {
      const codeRef = doc(db, 'twoFactorCodes', userId);
      const codeDoc = await getDoc(codeRef);

      if (!codeDoc.exists()) {
        return { valid: false, error: 'Code not found or expired' };
      }

      const data = codeDoc.data();
      const codeHash = CryptoJS.SHA256(code).toString();

      // Check if code matches
      if (codeHash !== data.codeHash) {
        return { valid: false, error: 'Invalid code' };
      }

      // Check if code expired
      if (Date.now() > data.expiresAt) {
        return { valid: false, error: 'Code expired' };
      }

      // Mark code as used
      await updateDoc(codeRef, {
        used: true,
        usedAt: Date.now()
      });

      // Enable 2FA for user
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        twoFactorEnabled: true,
        twoFactorVerified: true
      });

      return { valid: true };
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      throw error;
    }
  }

  // Check if user has 2FA enabled
  async is2FAEnabled(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      return userDoc.exists() && userDoc.data().twoFactorEnabled === true;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  // Disable 2FA
  async disable2FA(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        twoFactorEnabled: false,
        twoFactorVerified: false
      });
      return { success: true };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  // Require 2FA on login
  async require2FAOnLogin(userId) {
    try {
      const isEnabled = await this.is2FAEnabled(userId);
      if (isEnabled) {
        // Get user phone/email
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Send code
        await this.send2FACode(userId, userData.phoneNumber, userData.email);
        return { requires2FA: true };
      }
      return { requires2FA: false };
    } catch (error) {
      console.error('Error requiring 2FA:', error);
      throw error;
    }
  }
}

export const twoFactorService = new TwoFactorService();
export default twoFactorService;


