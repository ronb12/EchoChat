import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';

// Test users for development
const TEST_USERS = [
  { uid: 'test-user-1', displayName: 'Test User 1', email: 'testuser1@echochat.com', accountType: 'personal' },
  { uid: 'test-user-2', displayName: 'Test User 2', email: 'testuser2@echochat.com', accountType: 'personal' },
  { uid: 'test-user-3', displayName: 'Test User 3', email: 'testuser3@echochat.com', accountType: 'personal' },
  { uid: 'test-business-1', displayName: 'Test Business Account', email: 'business@echochat.com', accountType: 'business' }
];

export default function LoginModal() {
  const { closeLoginModal, showLoginModal } = useUI();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState(''); // Must be selected: 'personal' or 'business'
  const [showAccountTypeSelection, setShowAccountTypeSelection] = useState(false);
  
  // Load previously selected account type if exists
  useEffect(() => {
    const savedType = localStorage.getItem('selected_account_type');
    if (savedType && (savedType === 'personal' || savedType === 'business')) {
      setAccountType(savedType);
    }
  }, []);

  const handleQuickLogin = (testUser) => {
    console.log('Quick login clicked for:', testUser);
    const accountType = testUser.accountType || 'personal';
    const userData = {
      ...testUser,
      accountType: accountType,
      isBusinessAccount: accountType === 'business'
    };
    
    // Store account type in localStorage
    localStorage.setItem('echochat_account_type', accountType);
    
    setUser(userData);
    closeLoginModal();
  };

  const handleAccountTypeSelect = (type) => {
    setAccountType(type);
    setShowAccountTypeSelection(false);
    // Store account type selection
    localStorage.setItem('selected_account_type', type);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Validate account type is selected
    if (!accountType || accountType === '') {
      alert('Please select an account type (Personal or Business)');
      setShowAccountTypeSelection(true);
      return;
    }
    
    // Simple login - accept any credentials for demo
    if (email && password) {
      const selectedType = accountType || localStorage.getItem('selected_account_type') || 'personal';
      
      setUser({
        uid: `user_${Date.now()}`,
        displayName: email.split('@')[0],
        email: email,
        accountType: selectedType,
        isBusinessAccount: selectedType === 'business'
      });
      
      // Store account type in localStorage
      localStorage.setItem('echochat_account_type', selectedType);
      localStorage.removeItem('selected_account_type'); // Clean up
      
      closeLoginModal();
    }
  };

  if (!showLoginModal) {
    return null;
  }

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Login</h2>
          <button className="modal-close" onClick={closeLoginModal}>&times;</button>
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
              {/* Quick Test Users */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  Quick Login (Test Users)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {TEST_USERS.map((user, index) => {
                    const isBusiness = user.accountType === 'business';
                    return (
                      <button
                        key={user.uid}
                        className="btn btn-secondary"
                        onClick={() => handleQuickLogin(user)}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          justifyContent: 'flex-start',
                          border: isBusiness ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                          background: isBusiness ? 'rgba(0, 132, 255, 0.1)' : 'var(--surface-color)'
                        }}
                        data-testid={`test-user-${index + 1}-btn`}
                        data-user-index={index}
                        data-account-type={user.accountType || 'personal'}
                      >
                        {isBusiness ? '🏢' : '👤'} {user.displayName} ({user.email})
                        {isBusiness && (
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '0.75rem', 
                            color: 'var(--primary-color)',
                            fontWeight: '600'
                          }}>
                            [Business]
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
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
                      minLength={6}
                    />
                    <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
                      Minimum 6 characters
                    </small>
                  </div>
                  
                  {/* Show account type reminder */}
                  <div className="form-group" style={{ 
                    padding: '0.75rem', 
                    background: accountType === 'business' ? 'rgba(0, 132, 255, 0.1)' : 'var(--surface-color)',
                    borderRadius: '8px',
                    border: `1px solid ${accountType === 'business' ? 'var(--primary-color)' : 'var(--border-color)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {accountType === 'business' ? '🏢' : '👤'}
                      </span>
                      <span style={{ fontWeight: '600', margin: 0 }}>
                        Account Type: {accountType === 'business' ? 'Business Account' : 'Personal Account'}
                      </span>
                    </div>
                    {accountType && (
                      <div style={{ 
                        padding: '0.75rem', 
                        background: 'var(--surface-color)', 
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        color: 'var(--text-color-secondary)',
                        textAlign: 'center'
                      }}>
                        Account type selected above
                      </div>
                    )}
                    {!accountType && (
                      <select
                        id="account-type"
                        value={accountType}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setAccountType(selected);
                          if (selected) {
                            localStorage.setItem('selected_account_type', selected);
                          }
                        }}
                        required
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)',
                          background: 'var(--background-color)',
                          color: 'var(--text-color)',
                          fontSize: '0.95rem'
                        }}
                      >
                        <option value="">-- Select Account Type (Required) --</option>
                        <option value="personal">👤 Personal Account</option>
                        <option value="business">🏢 Business Account</option>
                      </select>
                    )}
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={!accountType || accountType === ''}
                  >
                    {accountType === 'business' ? 'Create Business Account' : accountType === 'personal' ? 'Create Personal Account' : 'Select Account Type First'}
                  </button>
                  {!accountType && (
                    <p style={{ fontSize: '0.85rem', color: '#f44336', marginTop: '0.5rem', textAlign: 'center' }}>
                      ⚠️ Account type selection is required
                    </p>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

