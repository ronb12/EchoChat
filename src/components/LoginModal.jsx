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

