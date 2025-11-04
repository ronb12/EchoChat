import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export default function SignUpModal() {
  const { closeSignUpModal, showSignUpModal, showNotification, openLoginModal } = useUI();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [showAccountTypeSelection, setShowAccountTypeSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load previously selected account type if exists
  useEffect(() => {
    const savedType = localStorage.getItem('selected_account_type');
    if (savedType && (savedType === 'personal' || savedType === 'business')) {
      setAccountType(savedType);
    }
  }, []);

  const handleGoogleSignUp = async () => {
    if (!accountType) {
      setError('Please select an account type first');
      setShowAccountTypeSelection(true);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authService.signInWithGoogle();
      if (result.success) {
        // Store account type
        localStorage.setItem('echochat_account_type', accountType);
        showNotification('Account created with Google successfully!', 'success');
        closeSignUpModal();
      } else {
        setError(result.error || 'Failed to sign up with Google');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountTypeSelect = (type) => {
    setAccountType(type);
    setShowAccountTypeSelection(false);
    localStorage.setItem('selected_account_type', type);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    // Validate account type is selected
    if (!accountType || accountType === '') {
      setError('Please select an account type (Personal or Business)');
      setShowAccountTypeSelection(true);
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signUp(email, password, displayName || email.split('@')[0]);

      if (result.success) {
        // Store account type
        localStorage.setItem('echochat_account_type', accountType);
        localStorage.removeItem('selected_account_type');
        
        showNotification('Account created successfully!', 'success');
        closeSignUpModal();
        
        // Reset form
        setEmail('');
        setPassword('');
        setDisplayName('');
        setError('');
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    closeSignUpModal();
    openLoginModal();
  };

  if (!showSignUpModal) {
    return null;
  }

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && closeSignUpModal()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create Account</h2>
          <button className="modal-close" onClick={closeSignUpModal}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Account Type Selection */}
          {showAccountTypeSelection ? (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'center' }}>
                Choose Account Type
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleAccountTypeSelect('personal')}
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: accountType === 'personal' ? 'var(--primary-color)' : 'var(--surface-color)'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>👤</span>
                  <strong>Personal Account</strong>
                  <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>For personal messaging and communication</span>
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleAccountTypeSelect('business')}
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: accountType === 'business' ? 'var(--primary-color)' : 'var(--surface-color)'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>🏢</span>
                  <strong>Business Account</strong>
                  <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Business hours, auto-reply, analytics & more</span>
                </button>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAccountTypeSelection(false)}
                style={{ width: '100%' }}
              >
                Back
              </button>
            </div>
          ) : (
            <>
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

              {/* Google Sign Up */}
              <button
                className="btn btn-secondary"
                onClick={handleGoogleSignUp}
                disabled={isLoading || !accountType}
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
                Sign up with Google
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
                Create New Account
              </h3>

              {/* Account Type Selection - Always Required */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.95rem' }}>
                  Account Type <span style={{ color: '#f44336' }}>*</span>
                </label>
                {!accountType ? (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
                      Select your account type to continue
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowAccountTypeSelection(true)}
                      style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', marginBottom: '0.5rem' }}
                    >
                      Choose Account Type
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem',
                    background: accountType === 'business' ? 'rgba(0, 132, 255, 0.1)' : 'var(--surface-color)',
                    borderRadius: '8px',
                    border: `2px solid ${accountType === 'business' ? 'var(--primary-color)' : 'var(--border-color)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '2rem' }}>
                          {accountType === 'business' ? '🏢' : '👤'}
                        </span>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                            {accountType === 'business' ? 'Business Account' : 'Personal Account'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {accountType === 'business'
                              ? 'Business hours, auto-reply, analytics & more'
                              : 'Personal messaging and communication'}
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setAccountType('');
                          setShowAccountTypeSelection(true);
                        }}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSignUp}>
                <div className="form-group">
                  <label htmlFor="displayName">Display Name (Optional)</label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
                    Minimum 6 characters
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={!accountType || accountType === '' || isLoading}
                >
                  {isLoading 
                    ? 'Creating Account...' 
                    : accountType === 'business' 
                      ? 'Create Business Account'
                      : 'Create Personal Account'
                  }
                </button>
                {!accountType && (
                  <p style={{ fontSize: '0.85rem', color: '#f44336', marginTop: '0.5rem', textAlign: 'center' }}>
                    ⚠️ Account type selection is required
                  </p>
                )}
              </form>

              {/* Link to login */}
              <div style={{ marginTop: '1.5rem', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Already have an account?
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={handleSwitchToLogin}
                  style={{ fontSize: '0.9rem' }}
                >
                  Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

