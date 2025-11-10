import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { parentLinkService } from '../services/parentLinkService';

export default function LinkChildModal() {
  const { closeLinkChildModal, showLinkChildModal, showNotification } = useUI();
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Enter email, 2: Verify code
  const [childEmail, setChildEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!childEmail || !childEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const result = await parentLinkService.sendChildVerificationCode(childEmail);

      if (result.success) {
        // Show code for testing (in production, send via email)
        alert(`Verification code sent to ${childEmail}\n\nCode (for testing): ${result.code}\n\nIn production, this would be sent via email to the child.`);

        setStep(2);
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError(error.message || 'Error sending verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    if (!user) {
      setError('You must be logged in to link a child account');
      return;
    }

    try {
      setLoading(true);
      const result = await parentLinkService.linkChildByEmail(user.uid, childEmail, verificationCode);

      if (result.success) {
        showNotification('Child account linked successfully!', 'success');
        closeLinkChildModal();
        // Reset form
        setStep(1);
        setChildEmail('');
        setVerificationCode('');
        setError('');
      }
    } catch (error) {
      console.error('Error linking child:', error);
      setError(error.message || 'Error linking child account');
    } finally {
      setLoading(false);
    }
  };

  if (!showLinkChildModal) {return null;}

  return (
    <div className="modal active" id="link-child-modal">
      <div className="modal-backdrop" onClick={closeLinkChildModal}></div>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>🔒 Link Child Account</h2>
          <button className="modal-close" onClick={closeLinkChildModal}>&times;</button>
        </div>
        <div className="modal-body">
          {step === 1 && (
            <form onSubmit={handleEmailSubmit}>
              <div style={{
                padding: '1rem',
                background: 'rgba(0, 132, 255, 0.1)',
                border: '1px solid rgba(0, 132, 255, 0.3)',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: 'var(--text-primary, #333)'
              }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: 'white' }}>
                  Link Your Child's Account
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'white' }}>
                  Enter your child's email address to link their account. A verification code will be sent to confirm.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="child-email">Child's Email Address</label>
                <input
                  id="child-email"
                  type="email"
                  value={childEmail}
                  onChange={(e) => setChildEmail(e.target.value)}
                  placeholder="child@example.com"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)', marginTop: '0.5rem' }}>
                  The email address your child used to sign up
                </p>
              </div>
              {error && <div style={{ color: 'var(--error-color, red)', marginTop: '0.5rem' }}>{error}</div>}
              <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeLinkChildModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleCodeSubmit}>
              <div style={{
                padding: '1rem',
                background: 'rgba(0, 132, 255, 0.1)',
                border: '1px solid rgba(0, 132, 255, 0.3)',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: 'var(--text-primary, #333)'
              }}>
                <p style={{ margin: 0, color: 'var(--text-primary, #333)' }}>
                  A verification code has been sent to <strong>{childEmail}</strong>
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                  Please ask your child to check their email and provide the code.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="link-code">Verification Code</label>
                <input
                  id="link-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5rem' }}
                />
              </div>
              {error && <div style={{ color: 'var(--error-color, red)', marginTop: '0.5rem' }}>{error}</div>}
              <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

