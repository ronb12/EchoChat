import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/profileService';

export default function StatusModal() {
  const { closeStatusModal } = useUI();
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [emoji, setEmoji] = useState('👋');
  const [expiresIn, setExpiresIn] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const profile = await profileService.getUserProfile(user.uid);
      setCurrentProfile(profile);
      setStatus(profile.status || '');
      setEmoji(profile.statusEmoji || '👋');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSave = async () => {
    if (!user) {return;}

    setLoading(true);
    try {
      const normalizedStatus = status.trim();
      const expiresTimestamp = expiresIn ? Date.now() + (parseInt(expiresIn, 10) * 60 * 60 * 1000) : null;
      await profileService.setStatus(
        user.uid,
        normalizedStatus,
        emoji,
        expiresIn ? parseInt(expiresIn) : null
      );
      window.dispatchEvent(new CustomEvent('profile:status-updated', {
        detail: {
          userId: user.uid,
          status: normalizedStatus,
          statusEmoji: emoji,
          statusExpiresAt: expiresTimestamp
        }
      }));
      closeStatusModal();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const commonStatuses = [
    { emoji: '👋', text: 'Hey there! I am using EchoChat' },
    { emoji: '😊', text: 'Available' },
    { emoji: '🤔', text: 'Thinking...' },
    { emoji: '💼', text: 'At work' },
    { emoji: '🏠', text: 'At home' },
    { emoji: '✈️', text: 'Traveling' }
  ];

  const emojis = ['👋', '😊', '🤔', '💼', '🏠', '✈️', '❤️', '🎉', '🚀', '⭐', '🔥', '💪'];

  return (
    <div className="modal active" id="status-modal">
      <div className="modal-backdrop" onClick={closeStatusModal}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Update Status</h2>
          <button className="modal-close" onClick={closeStatusModal}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Status Emoji</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {emojis.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    fontSize: '2rem',
                    background: emoji === e ? 'var(--primary-color)' : 'var(--surface-color)',
                    border: '2px solid',
                    borderColor: emoji === e ? 'var(--primary-color)' : 'var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    width: '60px',
                    height: '60px'
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status-text">Status Text</label>
            <input
              id="status-text"
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Quick Status</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {commonStatuses.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setStatus(s.text);
                    setEmoji(s.emoji);
                  }}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{s.emoji}</span>
                  <span style={{ color: 'var(--text-color)' }}>{s.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status-expires">Expires In (hours, optional)</label>
            <input
              id="status-expires"
              type="number"
              value={expiresIn || ''}
              onChange={(e) => setExpiresIn(e.target.value)}
              placeholder="Leave empty for permanent"
              min="1"
              max="168"
            />
          </div>

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={closeStatusModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!status.trim() || loading}
            >
              {loading ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


