import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // In production, send to error reporting service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
            We&apos;re sorry for the inconvenience. Please try refreshing the page.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={this.handleReset}
            >
              Try Again
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                background: 'var(--surface-color)',
                padding: '1rem',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '0.875rem'
              }}>
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary;


