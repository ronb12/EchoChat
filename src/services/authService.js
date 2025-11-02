// Authentication Service for EchoChat
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  TwitterAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig.js';
import { encryptionService } from './encryptionService.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userKeyPair = null;
    this.authStateListeners = [];
  }

  // Set up authentication state listener
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, async(user) => {
      if (user) {
        this.currentUser = user;
        await this.initializeUserData(user);
      } else {
        this.currentUser = null;
        this.userKeyPair = null;
      }
      callback(user);
    });
  }

  // Initialize user data and encryption keys
  async initializeUserData(user) {
    try {
      // Get or create user document
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user document
        await this.createUserProfile(user);
      } else {
        // Update last seen
        await updateDoc(userRef, {
          lastSeen: new Date(),
          isOnline: true
        });
      }

      // Initialize encryption keys
      await this.initializeEncryptionKeys(user.uid);

    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  }

  // Create user profile
  async createUserProfile(user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || '/icons/default-avatar.png',
        createdAt: new Date(),
        lastSeen: new Date(),
        isOnline: true,
        preferences: {
          theme: 'auto',
          notifications: true,
          readReceipts: true,
          typingIndicators: true
        },
        privacy: {
          lastSeen: 'contacts',
          profileVisibility: 'contacts',
          readReceipts: true
        }
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }

  // Initialize encryption keys for user
  async initializeEncryptionKeys(userId) {
    try {
      // Check if keys already exist
      const existingKeys = await encryptionService.retrieveKeySecurely(`${userId}_keys`);

      if (!existingKeys) {
        // Generate new key pair
        this.userKeyPair = await encryptionService.generateKeyPair();

        // Store keys securely
        await encryptionService.storeKeySecurely(`${userId}_keys`, JSON.stringify(this.userKeyPair));

        // Store public key in Firestore
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          publicKey: this.userKeyPair.publicKey,
          keyGeneratedAt: new Date()
        });
      } else {
        // Load existing keys
        this.userKeyPair = JSON.parse(existingKeys);
      }
    } catch (error) {
      console.error('Error initializing encryption keys:', error);
    }
  }

  // Sign in with email and password
  async signInWithEmail(email, password) {
    try {
      console.log('AuthService: Attempting sign in with email:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('AuthService: Sign in successful for user:', result.user.email);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('AuthService: Sign in error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Create account with email and password
  async createAccount(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      await updateProfile(result.user, {
        displayName: displayName
      });

      return { success: true, user: result.user };
    } catch (error) {
      console.error('Create account error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign in with Google - removed
  // async signInWithGoogle() {
  //   try {
  //     const provider = new GoogleAuthProvider();
  //     const result = await signInWithPopup(auth, provider);
  //     return { success: true, user: result.user };
  //   } catch (error) {
  //     console.error('Google sign in error:', error);
  //     return { success: false, error: this.getErrorMessage(error.code) };
  //   }
  // }

  // Sign in with Facebook - removed
  // async signInWithFacebook() {
  //   try {
  //     const provider = new FacebookAuthProvider();
  //     const result = await signInWithPopup(auth, provider);
  //     return { success: true, user: result.user };
  //   } catch (error) {
  //     console.error('Facebook sign in error:', error);
  //     return { success: false, error: this.getErrorMessage(error.code) };
  //   }
  // }

  // Sign in with Twitter
  async signInWithTwitter() {
    try {
      const provider = new TwitterAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Twitter sign in error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign out
  async signOut() {
    try {
      // Update user status to offline
      if (this.currentUser) {
        const userRef = doc(db, 'users', this.currentUser.uid);
        await updateDoc(userRef, {
          isOnline: false,
          lastSeen: new Date()
        });
      }

      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Update user profile
  async updateUserProfile(updates) {
    try {
      if (!this.currentUser) {
        return { success: false, error: 'No user logged in' };
      }

      const userRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userRef, updates);

      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return { success: true, profile: userDoc.data() };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's encryption key pair
  getKeyPair() {
    return this.userKeyPair;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Get error message from error code
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account already exists with this email address.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed.',
      'auth/cancelled-popup-request': 'Sign-in popup was cancelled.',
      'auth/popup-blocked': 'Popup was blocked by browser. Please allow popups for this site.'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }

  // Set user status
  async setUserStatus(status) {
    try {
      if (!this.currentUser) {
        return;
      }

      const userRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userRef, {
        status: status,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error setting user status:', error);
    }
  }

  // Get user status
  async getUserStatus(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen,
          status: data.status || 'available'
        };
      }
    } catch (error) {
      console.error('Error getting user status:', error);
    }
    return null;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
