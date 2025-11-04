import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export default function LoginModal() {
  const { closeLoginModal, showLoginModal, showNotification, openSignUpModal } = useUI();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await authService.signInWithGoogle();
      if (result.success) {
        showNotification('Signed in with Google successfully!', 'success');
        closeLoginModal();
      } else {
        setError(result.error || 'Failed to sign in with Google');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      // Sign in existing user
      const result = await authService.signIn(email, password);

      if (result.success) {
        showNotification('Signed in successfully!', 'success');
        closeLoginModal();
        
        // Reset form
        setEmail('');
        setPassword('');
        setError('');
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToSignUp = () => {
    closeLoginModal();
    openSignUpModal();
  };

  if (!showLoginModal) {
    return null;
  }

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Sign In</h2>
          <button className="modal-close" onClick={closeLoginModal}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Error message */}
          {error && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid #f44336',
              borderRadius: '8px',
              color: '#f44336',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <button
            className="btn btn-secondary"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            <span>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Sign In to Your Account
          </h3>

                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                {/* Link to sign up */}
                <div style={{ marginTop: '1.5rem', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Don't have an account?
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={handleSwitchToSignUp}
                    style={{ fontSize: '0.9rem' }}
                  >
                    Create Account
                  </button>
                </div>
        </div>
      </div>
    </div>
  );
}

