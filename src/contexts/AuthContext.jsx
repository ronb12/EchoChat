import React, { createContext, useContext, useState, useMemo } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Removed auto-login in development to match production behavior
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const value = useMemo(() => ({ user, setUser, loading, setLoading }), [user, loading]);

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

