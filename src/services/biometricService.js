// Biometric Authentication Service (Touch ID / Face ID)
// Uses Web Authentication API for biometric authentication

class BiometricService {
  constructor() {
    this.isSupported = this.checkSupport();
  }

  /**
   * Check if Web Authentication API is supported
   * @returns {boolean}
   */
  checkSupport() {
    if (typeof window === 'undefined') return false;
    
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create
    );
  }

  /**
   * Check if biometric authentication is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (!this.isSupported) {
      console.log('Web Authentication API not supported');
      return false;
    }

    try {
      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Register biometric authentication for a user
   * @param {string} userId - User's ID
   * @param {string} username - User's username/email
   * @returns {Promise<{success: boolean, credentialId?: string, error?: string}>}
   */
  async register(userId, username) {
    if (!this.isSupported) {
      return { success: false, error: 'Biometric authentication not supported on this device' };
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        return { success: false, error: 'Biometric authentication not available on this device' };
      }

      // Create credential for biometric authentication
      const publicKeyCredentialCreationOptions = {
        challenge: this.generateChallenge(),
        rp: {
          name: 'EchoChat',
          id: window.location.hostname,
        },
        user: {
          id: this.stringToArrayBuffer(userId),
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'direct',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      // Store credential ID in localStorage (in production, store on server)
      const credentialId = this.arrayBufferToBase64(credential.rawId);
      localStorage.setItem(`biometric_credential_${userId}`, credentialId);

      return { success: true, credentialId };
    } catch (error) {
      console.error('Error registering biometric:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to register biometric authentication' 
      };
    }
  }

  /**
   * Authenticate using biometric
   * @param {string} userId - User's ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async authenticate(userId) {
    if (!this.isSupported) {
      return { success: false, error: 'Biometric authentication not supported' };
    }

    try {
      const credentialId = localStorage.getItem(`biometric_credential_${userId}`);
      if (!credentialId) {
        return { success: false, error: 'Biometric not registered for this user' };
      }

      const publicKeyCredentialRequestOptions = {
        challenge: this.generateChallenge(),
        allowCredentials: [{
          id: this.base64ToArrayBuffer(credentialId),
          type: 'public-key',
          transports: ['internal'],
        }],
        timeout: 60000,
        userVerification: 'required',
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (assertion) {
        return { success: true };
      }

      return { success: false, error: 'Biometric authentication failed' };
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric authentication was cancelled or failed' };
      }
      return { success: false, error: error.message || 'Biometric authentication failed' };
    }
  }

  /**
   * Check if biometric is registered for user
   * @param {string} userId - User's ID
   * @returns {boolean}
   */
  isRegistered(userId) {
    return !!localStorage.getItem(`biometric_credential_${userId}`);
  }

  /**
   * Remove biometric registration
   * @param {string} userId - User's ID
   */
  unregister(userId) {
    localStorage.removeItem(`biometric_credential_${userId}`);
  }

  /**
   * Generate a random challenge
   * @returns {Uint8Array}
   */
  generateChallenge() {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Convert string to ArrayBuffer
   * @param {string} str
   * @returns {ArrayBuffer}
   */
  stringToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * Convert ArrayBuffer to base64
   * @param {ArrayBuffer} buffer
   * @returns {string}
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   * @param {string} base64
   * @returns {ArrayBuffer}
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const biometricService = new BiometricService();

