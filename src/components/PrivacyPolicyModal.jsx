import React from 'react';
import { useUI } from '../hooks/useUI';

export default function PrivacyPolicyModal() {
  const { showPrivacyModal, closePrivacyModal } = useUI();

  if (!showPrivacyModal) {
    return null;
  }

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && closePrivacyModal()}>
      <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--background-color)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
          <h2>Privacy Policy</h2>
          <button className="modal-close" onClick={closePrivacyModal}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '2rem' }}>
          <div style={{ lineHeight: '1.8', color: 'var(--text-color)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', marginBottom: '2rem' }}>
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>1. Introduction</h3>
              <p style={{ marginBottom: '1rem' }}>
                EchoDynamo ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our messaging application and services.
              </p>
              <p>
                By using EchoDynamo, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>2. Information We Collect</h3>

              <h4 style={{ fontSize: '1.2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>2.1 Personal Information</h4>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Email address</li>
                <li>Display name or alias</li>
                <li>Profile picture</li>
                <li>Phone number (if provided)</li>
              </ul>

              <h4 style={{ fontSize: '1.2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>2.2 Messages and Content</h4>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Text messages, images, files, and media shared in chats</li>
                <li>Voice recordings</li>
                <li>Group chat participation</li>
              </ul>

              <h4 style={{ fontSize: '1.2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>2.3 Usage Data</h4>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Device information (type, operating system)</li>
                <li>IP address and location data</li>
                <li>App usage statistics</li>
                <li>Last seen and online status</li>
              </ul>

              <h4 style={{ fontSize: '1.2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>2.4 Business Account Information</h4>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Business name and profile</li>
                <li>Business hours and status</li>
                <li>Customer interaction data (if applicable)</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>3. How We Use Your Information</h3>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>To provide and maintain our messaging services</li>
                <li>To deliver messages and notifications</li>
                <li>To authenticate your identity</li>
                <li>To improve and personalize your experience</li>
                <li>To process payments (for business accounts)</li>
                <li>To detect and prevent fraud or abuse</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>4. Data Security</h3>
              <p style={{ marginBottom: '1rem' }}>
                We implement industry-standard security measures to protect your information:
              </p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>End-to-end encryption for messages</li>
                <li>Secure authentication protocols</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and data encryption at rest</li>
              </ul>
              <p style={{ marginTop: '1rem', color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                <strong>Note:</strong> While we strive to protect your data, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>5. Data Sharing and Disclosure</h3>
              <p style={{ marginBottom: '1rem' }}>
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>With your explicit consent</li>
                <li>To service providers who assist in operating our app (payment processors, cloud storage)</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect our rights, privacy, safety, or property</li>
                <li>In connection with a business transfer (merger, acquisition)</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>6. Your Privacy Rights</h3>
              <p style={{ marginBottom: '1rem' }}>You have the right to:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
                <li><strong>Privacy Settings:</strong> Control visibility of your profile, status, and last seen</li>
              </ul>
              <p style={{ marginTop: '1rem' }}>
                To exercise these rights, please contact us at <strong>privacy@echodynamo.com</strong>
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>7. Data Retention</h3>
              <p style={{ marginBottom: '1rem' }}>
                We retain your information for as long as necessary to provide our services and comply with legal obligations. Messages and media may be stored until:
              </p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>You delete them</li>
                <li>You delete your account</li>
                <li>We are legally required to delete them</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>8. Children's Privacy</h3>
              <p>
                EchoDynamo is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>9. International Data Transfers</h3>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>10. Changes to This Privacy Policy</h3>
              <p style={{ marginBottom: '1rem' }}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by:
              </p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending you a notification (for material changes)</li>
              </ul>
              <p>
                Your continued use of EchoDynamo after changes become effective constitutes acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>11. Contact Us</h3>
              <p style={{ marginBottom: '1rem' }}>
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                <p style={{ marginBottom: '0.5rem' }}><strong>Email:</strong> privacy@echodynamo.com</p>
                <p style={{ marginBottom: '0.5rem' }}><strong>Support:</strong> support@echodynamo.com</p>
                <p><strong>Address:</strong> EchoDynamo Privacy Team</p>
              </div>
            </section>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={closePrivacyModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


