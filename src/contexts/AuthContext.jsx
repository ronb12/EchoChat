import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    let mounted = true;
    let authInitialized = false;
    
    // On mount, clear any demo user data if no Firebase user exists
    // This ensures demo users don't persist across hard refreshes
    try {
      if (!auth.currentUser) {
        localStorage.removeItem('echochat_user');
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    try {
      // Helper function to set user from Firebase user
      const setUserFromFirebase = (firebaseUser) => {
        if (!mounted) return;
        
        try {
          if (firebaseUser) {
            // User is signed in
            const accountType = localStorage.getItem('echochat_account_type') || 'personal';
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL,
              accountType: accountType,
              isBusinessAccount: accountType === 'business',
              emailVerified: firebaseUser.emailVerified
            };
            setUser(userData);
          } else {
            // User is signed out - clear any demo user from localStorage
            // Demo users should not persist across sessions
            localStorage.removeItem('echochat_user');
            setUser(null);
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
          setUser(null);
        } finally {
          if (mounted) {
            authInitialized = true;
            setLoading(false);
          }
        }
      };

      // Check for Google sign-in redirect result on page load
      // This must be called IMMEDIATELY to complete the sign-in flow after redirect
      // Chrome's bounce tracking mitigations might interfere, so we check immediately
      (async () => {
        try {
          // Check for redirect result immediately - don't wait for anything
          const result = await authService.getRedirectResult();
          console.log('Redirect result check:', result);
          
          if (result.success && result.user && mounted) {
            // Redirect result found - user will be set by onAuthStateChanged
            console.log('✅ Google sign-in redirect completed:', result.user.email);
          } else if (result.error) {
            console.warn('⚠️ Redirect result error:', result.error);
          } else {
            console.log('ℹ️ No redirect result (normal page load)');
          }
        } catch (error) {
          console.error('❌ Error checking redirect result:', error);
        }
      })();

      // Wait for onAuthStateChanged to fire - it will fire immediately with current state
      // This is more reliable than checking auth.currentUser directly
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!mounted) return;
        setUserFromFirebase(firebaseUser);
      });

      // Safety timeout - ensure loading state doesn't persist too long
      // If auth hasn't initialized after 1 second, show landing page (no user)
      const timeout = setTimeout(() => {
        if (mounted && !authInitialized) {
          // This is a safety net - if auth hasn't initialized by now,
          // assume no user (show landing page)
          if (auth.currentUser) {
            // User exists but listener hasn't fired yet - use currentUser
            setUserFromFirebase(auth.currentUser);
          } else {
            // No user - clear any demo user and show landing page
            localStorage.removeItem('echochat_user');
            setUser(null);
            setLoading(false);
          }
        }
      }, 1000); // Reduced from 3000ms to 1000ms for faster landing page display

      return () => {
        mounted = false;
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      // On error, ensure we show landing page (no user)
      if (mounted) {
        localStorage.removeItem('echochat_user');
        setUser(null);
        setLoading(false);
      }
    }
  }, []);

  const value = useMemo(() => ({ 
    user, 
    setUser, 
    loading, 
    setLoading,
    signOut: authService.signOut
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;

