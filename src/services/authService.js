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

  signInWithGoogle = async () => {
    try {
      console.log('signInWithGoogle called');
      // Use this.auth if available, otherwise fall back to direct auth import
      const authInstance = (this && this.auth) || auth;
      console.log('Auth instance:', authInstance ? 'found' : 'not found');
      
      if (!authInstance) {
        console.error('Auth object is not initialized');
        return { success: false, error: 'Authentication service not initialized' };
      }
      
      console.log('Creating GoogleAuthProvider...');
      const provider = new GoogleAuthProvider();
      
      // Add additional scopes if needed
      provider.addScope('profile');
      provider.addScope('email');
      
      console.log('Calling signInWithRedirect...');
      // Use redirect instead of popup to avoid COOP (Cross-Origin-Opener-Policy) issues
      await signInWithRedirect(authInstance, provider);
      console.log('signInWithRedirect completed - redirect should happen');
      
      // Note: signInWithRedirect will navigate away, so we return a pending state
      // This line may not execute if redirect happens immediately
      return { success: true, pending: true };
    } catch (error) {
      console.error('Error during Google sign-in redirect:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // If redirect is blocked, try to check if user is already signed in
      const authInstance = (this && this.auth) || auth;
      if (authInstance && authInstance.currentUser) {
        console.log('User already signed in, returning current user');
        return { success: true, user: authInstance.currentUser };
      }
      return { success: false, error: error.message || 'Failed to sign in with Google' };
    }
  }

  getRedirectResult = async () => {
    try {
      // Use this.auth if available, otherwise fall back to direct auth import
      const authInstance = (this && this.auth) || auth;
      if (!authInstance) {
        console.error('Auth object is not initialized');
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
