import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { db } from '../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

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
    if (savedType && (savedType === 'personal' || savedType === 'business' || savedType === 'parent')) {
      setAccountType(savedType);
    }
  }, []);

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
      setError('Please select an account type (Personal, Business, or Parent)');
      setShowAccountTypeSelection(true);
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!displayName || displayName.trim() === '') {
      setError('Display name is required');
      return;
    }

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signUp(email, password, displayName.trim());

      if (result.success && result.user) {
        // Store account type in localStorage
        localStorage.setItem('echochat_account_type', accountType);
        localStorage.removeItem('selected_account_type');

        // Create user profile in Firestore
        try {
          const userRef = doc(db, 'users', result.user.uid);
          await setDoc(userRef, {
            email: result.user.email,
            displayName: displayName.trim(),
            accountType: accountType,
            isBusinessAccount: accountType === 'business',
            isParent: accountType === 'parent',
            isMinor: false, // Will be set later if needed
            createdAt: Date.now(),
            children: accountType === 'parent' ? [] : undefined
          }, { merge: true });

          // If parent account, show link child flow
          if (accountType === 'parent') {
            showNotification('Parent account created! You can now link your child\'s account.', 'success');
            // Store flag to show link child modal after signup
            sessionStorage.setItem('showLinkChildFlow', 'true');
          } else {
            showNotification('Account created successfully!', 'success');
          }
        } catch (firestoreError) {
          console.error('Error creating user profile:', firestoreError);
          // Continue anyway - profile can be created later
          showNotification('Account created! Please complete your profile in Settings.', 'success');
        }

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
                <button
                  className="btn btn-primary"
                  onClick={() => handleAccountTypeSelect('parent')}
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: accountType === 'parent' ? 'var(--primary-color)' : 'var(--surface-color)'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>🔒</span>
                  <strong>Parent Account</strong>
                  <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Monitor and manage your child's account</span>
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
                          {accountType === 'business' ? '🏢' : accountType === 'parent' ? '🔒' : '👤'}
                        </span>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                            {accountType === 'business' ? 'Business Account' : accountType === 'parent' ? 'Parent Account' : 'Personal Account'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {accountType === 'business'
                              ? 'Business hours, auto-reply, analytics & more'
                              : accountType === 'parent'
                              ? 'Monitor and manage your child\'s account'
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
                  <label htmlFor="displayName">Display Name <span style={{ color: 'var(--error-color, #f44336)' }}>*</span></label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={isLoading}
                    required
                    minLength={2}
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
                      : accountType === 'parent'
                      ? 'Create Parent Account'
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

