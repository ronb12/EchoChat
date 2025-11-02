import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';

// Test users for development
const TEST_USERS = [
  { uid: 'test-user-1', displayName: 'Test User 1', email: 'testuser1@echochat.com' },
  { uid: 'test-user-2', displayName: 'Test User 2', email: 'testuser2@echochat.com' },
  { uid: 'test-user-3', displayName: 'Test User 3', email: 'testuser3@echochat.com' }
];

export default function LoginModal() {
  const { closeLoginModal, showLoginModal } = useUI();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleQuickLogin = (testUser) => {
    console.log('Quick login clicked for:', testUser);
    setUser(testUser);
    closeLoginModal();
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple login - accept any credentials for demo
    if (email && password) {
      setUser({
        uid: `user_${Date.now()}`,
        displayName: email.split('@')[0],
        email: email
      });
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
          {/* Quick Test Users */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Quick Login (Test Users)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {TEST_USERS.map((user, index) => (
                <button
                  key={user.uid}
                  className="btn btn-secondary"
                  onClick={() => handleQuickLogin(user)}
                  style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}
                  data-testid={`test-user-${index + 1}-btn`}
                  data-user-index={index}
                >
                  👤 {user.displayName} ({user.email})
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Custom Login
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
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

