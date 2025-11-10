import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';

export default function SupportModal() {
  const { showSupportModal, closeSupportModal } = useUI();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!showSupportModal) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production, this would send to a backend API
    console.log('Support request submitted:', { selectedCategory, subject, message });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedCategory('');
      setSubject('');
      setMessage('');
      closeSupportModal();
    }, 2000);
  };

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && closeSupportModal()}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Support & Help</h2>
          <button className="modal-close" onClick={closeSupportModal}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '2rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Thank You!</h3>
              <p>Your support request has been submitted. We'll get back to you soon.</p>
            </div>
          ) : (
            <>
              {/* Quick Help Links */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Quick Help</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('FAQ coming soon!'); }}
                    style={{
                      padding: '1rem',
                      background: 'var(--surface-color)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--border-color)'}
                    onMouseLeave={(e) => e.target.style.background = 'var(--surface-color)'}
                  >
                    📚 FAQ
                  </a>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('Tutorials coming soon!'); }}
                    style={{
                      padding: '1rem',
                      background: 'var(--surface-color)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--border-color)'}
                    onMouseLeave={(e) => e.target.style.background = 'var(--surface-color)'}
                  >
                    🎓 Tutorials
                  </a>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('Video guides coming soon!'); }}
                    style={{
                      padding: '1rem',
                      background: 'var(--surface-color)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--border-color)'}
                    onMouseLeave={(e) => e.target.style.background = 'var(--surface-color)'}
                  >
                    🎥 Video Guides
                  </a>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('Community forum coming soon!'); }}
                    style={{
                      padding: '1rem',
                      background: 'var(--surface-color)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--border-color)'}
                    onMouseLeave={(e) => e.target.style.background = 'var(--surface-color)'}
                  >
                    💬 Community
                  </a>
                </div>
              </div>

              {/* Contact Form */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Contact Support</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--background-color)',
                        color: 'var(--text-color)'
                      }}
                    >
                      <option value="">Select a category</option>
                      <option value="technical">🔧 Technical Issue</option>
                      <option value="account">👤 Account Problem</option>
                      <option value="billing">💳 Billing Question</option>
                      <option value="feature">✨ Feature Request</option>
                      <option value="bug">🐛 Bug Report</option>
                      <option value="business">🏢 Business Account</option>
                      <option value="other">❓ Other</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="subject">Subject</label>
                    <input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      required
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please provide details about your issue or question..."
                      required
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Submit Support Request
                  </button>
                </form>
              </div>

              {/* Support Information */}
              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'var(--surface-color)',
                borderRadius: '8px',
                borderTop: '2px solid var(--primary-color)'
              }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>Other Ways to Reach Us</h4>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>📧 Email:</strong> support@echodynamo.com
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>💬 Live Chat:</strong> Available Monday-Friday, 9 AM - 5 PM
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>📞 Phone:</strong> Coming soon
                  </p>
                  <p>
                    <strong>⏱️ Response Time:</strong> We typically respond within 24-48 hours
                  </p>
                </div>
              </div>

              {/* Common Issues */}
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>Common Issues</h4>
                <div style={{ fontSize: '0.9rem' }}>
                  <details style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--surface-color)', borderRadius: '4px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Can't send messages?</summary>
                    <p style={{ marginTop: '0.5rem', paddingLeft: '1rem', color: 'var(--text-color-secondary)' }}>
                      Check your internet connection, ensure you're logged in, and verify the recipient hasn't blocked you.
                    </p>
                  </details>
                  <details style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--surface-color)', borderRadius: '4px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Account not working?</summary>
                    <p style={{ marginTop: '0.5rem', paddingLeft: '1rem', color: 'var(--text-color-secondary)' }}>
                      Try logging out and back in, clear your browser cache, or reset your password.
                    </p>
                  </details>
                  <details style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--surface-color)', borderRadius: '4px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Payment issues?</summary>
                    <p style={{ marginTop: '0.5rem', paddingLeft: '1rem', color: 'var(--text-color-secondary)' }}>
                      Contact support with your transaction ID and payment method details.
                    </p>
                  </details>
                </div>
              </div>
            </>
          )}
        </div>
        {!submitted && (
          <div className="modal-footer" style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
            <button className="btn btn-secondary" onClick={closeSupportModal}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

