import React from 'react';
import { useUI } from '../hooks/useUI';

export default function TermsOfServiceModal() {
  const { showTermsModal, closeTermsModal } = useUI();

  if (!showTermsModal) {
    return null;
  }

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && closeTermsModal()}>
      <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--background-color)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
          <h2>Terms of Service</h2>
          <button className="modal-close" onClick={closeTermsModal}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '2rem' }}>
          <div style={{ lineHeight: '1.8', color: 'var(--text-color)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', marginBottom: '2rem' }}>
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>1. Acceptance of Terms</h3>
              <p style={{ marginBottom: '1rem' }}>
                By accessing or using EchoDynamo, you agree to be bound by these Terms of Service and all applicable laws and regulations.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>2. Use License</h3>
              <p style={{ marginBottom: '1rem' }}>
                Permission is granted to use EchoDynamo for personal and commercial purposes, subject to the restrictions set forth in these terms.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>3. User Conduct</h3>
              <p style={{ marginBottom: '1rem' }}>You agree not to:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Use EchoDynamo for any unlawful purpose</li>
                <li>Transmit harmful, abusive, or offensive content</li>
                <li>Impersonate others or provide false information</li>
                <li>Interfere with the security or functionality of the service</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>4. Contact</h3>
              <p style={{ marginBottom: '1rem' }}>
                For questions about these Terms of Service, please contact us at <strong>legal@echochat.com</strong>
              </p>
            </section>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={closeTermsModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
