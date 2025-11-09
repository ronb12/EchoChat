import React from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { openLoginModal, openSignUpModal, openPrivacyModal, openTermsModal, openSupportModal } = useUI();
  const { setUser } = useAuth();

  const continueAsDemo = () => {
    setUser({ uid: 'demo-user', displayName: 'Demo User', email: 'demo@example.com' });
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="logo-section">
              <div className="logo-icon">💬</div>
              <h1 className="app-title">EchoChat</h1>
              <p className="app-tagline">Secure, fast, and feature-rich messaging app</p>
            </div>

            <div className="hero-features">
              <div className="feature-item">
                <div className="feature-icon">🔐</div>
                <h3>Enterprise Security</h3>
                <p>End-to-end encrypted chats with biometric & 2FA</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎥</div>
                <h3>Voice & Video Calls</h3>
                <p>WebRTC calling with screen sharing built-in</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💼</div>
                <h3>Business & Family Ready</h3>
                <p>Stripe payments plus parental controls</p>
              </div>
            </div>

            <div className="cta-buttons" style={{ marginTop: '2rem' }}>
              <button className="btn btn-primary btn-large" onClick={openSignUpModal} data-testid="get-started-btn">
                Create Account
              </button>
              <button className="btn btn-secondary btn-large" onClick={openLoginModal} data-testid="sign-in-btn">
                Sign In
              </button>
              <button className="btn btn-secondary btn-large" onClick={continueAsDemo} data-testid="try-demo-btn">
                Try Demo
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-large">💬</div>
              <h3>Rich Messaging</h3>
              <p>Share images, videos, voice notes, GIFs, polls, reactions, and more in real time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📞</div>
              <h3>Live Collaboration</h3>
              <p>Hop into voice or video calls and share your screen without leaving the chat.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">💸</div>
              <h3>Payments Built-In</h3>
              <p>Send or request money with Stripe Connect, track cashouts, and manage subscriptions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">🛡️</div>
              <h3>Family Safety</h3>
              <p>Link parent and child accounts, approve contacts, and monitor activity with safety alerts.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">⚙️</div>
              <h3>Productivity Tools</h3>
              <p>Pin, forward, schedule, and search messages with responsive layouts across every device.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📲</div>
              <h3>Installable PWA</h3>
              <p>Use EchoChat offline, receive push notifications, and enjoy a native app experience.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to get started?</h2>
            <p>Join thousands of users enjoying secure, fast messaging</p>
            <div className="cta-buttons">
              <button className="btn btn-primary btn-large" onClick={openSignUpModal}>
                Sign Up Now
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-content">
            <p>© 2025 EchoChat is a product of Bradley Virtual Solutions, LLC. Secure messaging for everyone.</p>
            <div className="footer-links">
              <a href="#" onClick={(e) => { e.preventDefault(); openPrivacyModal(); }}>Privacy</a>
              <a href="#" onClick={(e) => { e.preventDefault(); openTermsModal(); }}>Terms</a>
              <a href="#" onClick={(e) => { e.preventDefault(); openSupportModal(); }}>Support</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

