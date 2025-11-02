import React from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';

export default function AppHeader() {
  const { toggleSidebar, openSettingsModal } = useUI();
  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="app-logo">
          <div className="logo-icon">💬</div>
          <div className="app-title">
            <h1>EchoChat</h1>
          </div>
        </div>
        <div className="connection-status">
          <span className="status-dot"></span>
          <span>Online</span>
        </div>
      </div>
      <div className="header-right">
        <button className="header-btn" onClick={openSettingsModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
          </svg>
          <span className="btn-label">Settings</span>
        </button>
        {user && (
          <div className="user-avatar" onClick={openSettingsModal}>
            <img 
              src={user.photoURL || `/icons/default-avatar.png`} 
              alt={user.displayName || 'User'} 
              onError={(e) => { e.target.src = '/icons/default-avatar.png'; }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

