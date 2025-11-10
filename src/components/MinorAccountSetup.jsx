import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { minorSafetyService } from '../services/minorSafetyService';
import { db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

export default function MinorAccountSetup({ onComplete }) {
  const { user } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1); // 1: Date of birth, 2: Parent email, 3: Verify code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleDateOfBirthSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!dateOfBirth) {
      setError('Please enter your date of birth');
      return;
    }

    const age = calculateAge(dateOfBirth);

    if (age < 13) {
      setError('You must be at least 13 years old to use EchoDynamo');
      return;
    }

    if (age < 18) {
      // Minor account - proceed to parent email step
      try {
        setLoading(true);
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          dateOfBirth,
          isMinor: true
        });
        setStep(2);
      } catch (error) {
        console.error('Error updating date of birth:', error);
        setError('Error saving date of birth. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Adult account - no parent approval needed
      try {
        setLoading(true);
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          dateOfBirth,
          isMinor: false
        });
        if (onComplete) {onComplete();}
      } catch (error) {
        console.error('Error updating date of birth:', error);
        setError('Error saving date of birth. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleParentEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!parentEmail || !parentEmail.includes('@')) {
      setError('Please enter a valid parent email address');
      return;
    }

    try {
      setLoading(true);
      // Send verification code to parent email
      // In production, this would send an actual email
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code temporarily (in production, use secure storage)
      sessionStorage.setItem('parentVerificationCode', code);
      sessionStorage.setItem('parentEmail', parentEmail);

      // Update user with parent email
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        parentEmail,
        parentVerified: false
      });

      // Show code for testing (in production, send via email)
      alert(`Parent verification code (for testing): ${code}\n\nIn production, this would be sent to ${parentEmail}`);

      setStep(3);
    } catch (error) {
      console.error('Error setting parent email:', error);
      setError('Error setting parent email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const storedCode = sessionStorage.getItem('parentVerificationCode');

    if (verificationCode !== storedCode) {
      setError('Invalid verification code. Please check and try again.');
      return;
    }

    try {
      setLoading(true);
      const parentEmail = sessionStorage.getItem('parentEmail');

      await minorSafetyService.verifyParent(user.uid, parentEmail, verificationCode);

      // Clear stored data
      sessionStorage.removeItem('parentVerificationCode');
      sessionStorage.removeItem('parentEmail');

      if (onComplete) {onComplete();}
    } catch (error) {
      console.error('Error verifying parent:', error);
      setError('Error verifying parent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" id="minor-account-setup">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>🔒 Account Setup</h2>
        </div>
        <div className="modal-body">
          {step === 1 && (
            <form onSubmit={handleDateOfBirthSubmit}>
              <div className="form-group">
                <label htmlFor="date-of-birth">Date of Birth</label>
                <input
                  id="date-of-birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  We need your date of birth to ensure proper safety features
                </p>
              </div>
              {error && <div style={{ color: 'var(--error-color, red)', marginTop: '0.5rem' }}>{error}</div>}
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleParentEmailSubmit}>
              <div style={{
                padding: '1rem',
                background: 'var(--info-bg, #e7f3ff)',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  Parent/Guardian Verification Required
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                  Since you're under 18, we need a parent or guardian to verify your account and approve your contacts.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="parent-email">Parent/Guardian Email</label>
                <input
                  id="parent-email"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  We'll send a verification code to this email
                </p>
              </div>
              {error && <div style={{ color: 'var(--error-color, red)', marginTop: '0.5rem' }}>{error}</div>}
              <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleVerificationSubmit}>
              <div style={{
                padding: '1rem',
                background: 'var(--info-bg, #e7f3ff)',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0 }}>
                  A verification code has been sent to <strong>{sessionStorage.getItem('parentEmail')}</strong>
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                  Please ask your parent/guardian to check their email and provide the code.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="verification-code">Verification Code</label>
                <input
                  id="verification-code"
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
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

