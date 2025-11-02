import React from 'react';
import { useUI } from '../hooks/useUI';

function SettingsModal() {
  const { closeSettingsModal, theme, toggleTheme } = useUI();

  return (
    <div className="modal active" id="settings-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={closeSettingsModal}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label htmlFor="theme-select">Theme</label>
              <select
                id="theme-select"
                value={theme}
                onChange={toggleTheme}
              >
                <option value="auto">Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Notifications</h3>
            <div className="setting-item">
              <label htmlFor="notifications-toggle">Enable Notifications</label>
              <input type="checkbox" id="notifications-toggle" defaultChecked />
            </div>
          </div>

          <div className="settings-section">
            <h3>Privacy</h3>
            <div className="setting-item">
              <label htmlFor="read-receipts-toggle">Read Receipts</label>
              <input type="checkbox" id="read-receipts-toggle" defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
