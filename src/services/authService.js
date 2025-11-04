// Authentication Service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from './firebaseConfig';

class AuthService {
  constructor() {
    this.auth = auth;
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signUp(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      if (displayName && userCredential.user) {
        await userCredential.user.updateProfile({ displayName });
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signInWithGoogle() {
    try {
      const authInstance = (this && this.auth) || auth;
      if (!authInstance) {
        return { success: false, error: 'Authentication service not initialized' };
      }
      
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(authInstance, provider);
      // Note: signInWithRedirect navigates away, so this won't execute
      return { success: true, pending: true };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { success: false, error: error.message || 'Failed to sign in with Google' };
    }
  }

  async getRedirectResult() {
    try {
      const authInstance = (this && this.auth) || auth;
      if (!authInstance) {
        return { success: false, error: 'Authentication service not initialized' };
      }
      
      const result = await getRedirectResult(authInstance);
      if (result && result.user) {
        return { success: true, user: result.user };
      }
      return { success: false, user: null };
    } catch (error) {
      console.error('Error getting redirect result:', error);
      return { success: false, error: error.message };
    }
  }

  signOut = async () => {
    try {
      // Use this.auth if available, otherwise fall back to direct auth import
      const authInstance = (this && this.auth) || auth;
      if (!authInstance) {
        console.error('Auth object is not initialized');
        return { success: false, error: 'Authentication service not initialized' };
      }
      await firebaseSignOut(authInstance);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message || 'Failed to sign out' };
    }
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(this.auth, callback);
  }
}

const authServiceInstance = new AuthService();
export default authServiceInstance;
export { authServiceInstance as authService };
