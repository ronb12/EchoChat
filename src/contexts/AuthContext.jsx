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
    
    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
            setLoading(false);
          }
        }
      });

      // Set a timeout to ensure loading doesn't hang forever
      const timeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth state change timeout - forcing loading to false');
          setLoading(false);
        }
      }, 5000);

      return () => {
        mounted = false;
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      setLoading(false);
      setUser(null);
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

