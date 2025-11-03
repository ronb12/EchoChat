import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { twoFactorService } from '../services/twoFactorService';

function SettingsModal() {
  const { closeSettingsModal, theme, toggleTheme } = useUI();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (user) {
      twoFactorService.is2FAEnabled(user.uid).then(setTwoFactorEnabled);
    }
  }, [user]);

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

          <div className="settings-section">
            <h3>Security</h3>
            <div className="setting-item">
              <label htmlFor="two-factor-toggle">Two-Factor Authentication</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="checkbox"
                  id="two-factor-toggle"
                  checked={twoFactorEnabled}
                  onChange={async (e) => {
                    if (e.target.checked) {
                      setShow2FAForm(true);
                    } else {
                      if (user && confirm('Are you sure you want to disable 2FA?')) {
                        await twoFactorService.disable2FA(user.uid);
                        setTwoFactorEnabled(false);
                      }
                    }
                  }}
                />
                <span>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              {show2FAForm && !twoFactorEnabled && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                  <div className="form-group">
                    <label htmlFor="phone-number">Phone Number</label>
                    <input
                      id="phone-number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="two-factor-code">Verification Code</label>
                    <input
                      id="two-factor-code"
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: '0.5rem' }}
                      onClick={async () => {
                        if (user && phoneNumber) {
                          await twoFactorService.send2FACode(user.uid, phoneNumber, user.email);
                        }
                      }}
                    >
                      Send Code
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        if (user && twoFactorCode) {
                          const result = await twoFactorService.verify2FACode(user.uid, twoFactorCode);
                          if (result.valid) {
                            setTwoFactorEnabled(true);
                            setShow2FAForm(false);
                            setTwoFactorCode('');
                            setPhoneNumber('');
                            alert('Two-factor authentication enabled!');
                          } else {
                            alert(result.error || 'Invalid code');
                          }
                        }
                      }}
                    >
                      Verify & Enable
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShow2FAForm(false);
                        setTwoFactorCode('');
                        setPhoneNumber('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
