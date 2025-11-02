import React from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { openLoginModal } = useUI();
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
                <div className="feature-icon">🔒</div>
                <h3>End-to-End Encryption</h3>
                <p>Your messages are protected</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <h3>Real-Time</h3>
                <p>Instant messaging experience</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📱</div>
                <h3>Cross-Platform</h3>
                <p>Works everywhere</p>
              </div>
            </div>

            <div className="cta-buttons" style={{ marginTop: '2rem' }}>
              <button className="btn btn-primary btn-large" onClick={openLoginModal} data-testid="get-started-btn">
                Get Started
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
              <h3>Secure Messaging</h3>
              <p>Send encrypted messages with end-to-end encryption to keep your conversations private and secure.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📎</div>
              <h3>File Sharing</h3>
              <p>Share images, documents, and files seamlessly with your contacts.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">👥</div>
              <h3>Group Chats</h3>
              <p>Create group conversations and stay connected with multiple people at once.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to get started?</h2>
            <p>Join thousands of users enjoying secure, fast messaging</p>
            <div className="cta-buttons">
              <button className="btn btn-primary btn-large" onClick={openLoginModal}>
                Sign Up Now
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-content">
            <p>© 2024 EchoChat. Secure messaging for everyone.</p>
            <div className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Support</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

