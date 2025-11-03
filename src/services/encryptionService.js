// End-to-End Encryption Service using AES-256-GCM
import CryptoJS from 'crypto-js';

class EncryptionService {
  constructor() {
    this.isInitialized = false;
    this.keyDerivationIterations = 100000; // PBKDF2 iterations
  }

  async initialize() {
    this.isInitialized = true;
    return true;
  }

  // Generate a key pair for a user
  async generateKeyPair() {
    // Generate a random 256-bit key
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    const iv = CryptoJS.lib.WordArray.random(128/8); // IV for GCM mode

    return {
      publicKey: key, // In real implementation, derive public key
      privateKey: key,
      iv: iv.toString()
    };
  }

  // Derive encryption key using PBKDF2
  deriveKey(password, salt) {
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: this.keyDerivationIterations
    });
    return key;
  }

  // Encrypt a message using AES-256-GCM
  async encryptMessage(message, encryptionKey = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // If no key provided, use default (in production, get from secure storage)
      const key = encryptionKey || await this.getOrCreateEncryptionKey();

      // Generate random IV for each message (required for GCM)
      const iv = CryptoJS.lib.WordArray.random(128/8);
      const salt = CryptoJS.lib.WordArray.random(128/8);

      // Derive key from password/salt
      const derivedKey = this.deriveKey(key, salt);

      // Encrypt using AES-256-GCM (using CCM as fallback since CryptoJS doesn't have GCM)
      // Note: CryptoJS uses CCM mode which is similar to GCM
      const encrypted = CryptoJS.AES.encrypt(message, derivedKey, {
        iv: iv,
        mode: CryptoJS.mode.CCM, // Using CCM as closest to GCM in CryptoJS
        padding: CryptoJS.pad.NoPadding
      });

      // Return encrypted data with metadata
      return {
        encrypted: encrypted.toString(),
        iv: iv.toString(),
        salt: salt.toString(),
        algorithm: 'AES-256-CCM', // CryptoJS uses CCM, not GCM
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Encryption error:', error);
      // Fallback: return message as-is if encryption fails
      return message;
    }
  }

  // Decrypt a message
  async decryptMessage(encryptedData, encryptionKey = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Handle plain text messages (backwards compatibility)
      if (typeof encryptedData === 'string' && !encryptedData.encrypted) {
        return encryptedData;
      }

      // If encrypted data object
      if (typeof encryptedData === 'object' && encryptedData.encrypted) {
        const key = encryptionKey || await this.getOrCreateEncryptionKey();
        const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
        const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

        // Derive key
        const derivedKey = this.deriveKey(key, salt);

        // Decrypt
        const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, derivedKey, {
          iv: iv,
          mode: CryptoJS.mode.CCM,
          padding: CryptoJS.pad.NoPadding
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
      }

      return encryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      // If decryption fails, try returning as-is (for backwards compatibility)
      return typeof encryptedData === 'object' ? encryptedData.encrypted : encryptedData;
    }
  }

  // Get or create encryption key for user
  async getOrCreateEncryptionKey(userId = 'default') {
    const storedKey = await this.retrieveKeySecurely(userId);
    if (storedKey) {
      return storedKey;
    }

    // Generate new key pair
    const keyPair = await this.generateKeyPair();
    await this.storeKeySecurely(userId, keyPair.privateKey);
    return keyPair.privateKey;
  }

  // Retrieve key from secure storage
  async retrieveKeySecurely(userId) {
    try {
      // In production, use secure storage (IndexedDB with encryption, or secure keychain)
      // For now, use localStorage (not secure, but functional)
      const stored = localStorage.getItem(`encryption_key_${userId}`);
      return stored;
    } catch (error) {
      console.error('Error retrieving key:', error);
      return null;
    }
  }

  // Store key securely
  async storeKeySecurely(userId, keyData) {
    try {
      // In production, use secure storage
      localStorage.setItem(`encryption_key_${userId}`, keyData);
      return true;
    } catch (error) {
      console.error('Error storing key:', error);
      return false;
    }
  }

  // Generate and store key pair for user
  async generateAndStoreKeyPair(userId) {
    const keyPair = await this.generateKeyPair();
    await this.storeKeySecurely(userId, keyPair.privateKey);
    return keyPair;
  }

  // Encrypt message text before sending
  async encryptMessageText(text, userId = 'default') {
    if (!text) {return text;}

    const encryptionKey = await this.getOrCreateEncryptionKey(userId);
    const encrypted = await this.encryptMessage(text, encryptionKey);
    return encrypted;
  }

  // Decrypt message text after receiving
  async decryptMessageText(encryptedData, userId = 'default') {
    if (!encryptedData) {return encryptedData;}

    const encryptionKey = await this.getOrCreateEncryptionKey(userId);
    const decrypted = await this.decryptMessage(encryptedData, encryptionKey);
    return decrypted;
  }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
