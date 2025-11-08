import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { businessService } from '../services/businessService';
import { chatService } from '../services/chatService';
import { useChat } from '../hooks/useChat';
import { useUI } from '../hooks/useUI';

export default function QuickReplyModal({ onClose }) {
  const { user } = useAuth();
  const { currentChatId } = useChat();
  const { showNotification } = useUI();
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadQuickReplies();
  }, []);

  const loadQuickReplies = async () => {
    if (!user) {return;}
    try {
      setLoading(true);
      const profile = await businessService.getBusinessProfile(user.uid);

      // Fallback to localStorage for demo
      if (!profile || !profile.quickReplies) {
        const stored = localStorage.getItem(`business_${user.uid}`);
        if (stored) {
          const business = JSON.parse(stored);
          setQuickReplies(business.quickReplies || []);
          return;
        }
      }

      setQuickReplies(profile?.quickReplies || []);
    } catch (error) {
      console.error('Error loading quick replies:', error);
      showNotification('Failed to load quick replies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredReplies = quickReplies.filter(reply =>
    reply.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reply.shortcut?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseQuickReply = async (reply) => {
    if (!currentChatId) {
      showNotification('Please select a chat first', 'info');
      return;
    }

    try {
      await chatService.sendMessage(currentChatId, {
        text: reply.text,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'User'
      });

      showNotification('Quick reply sent!', 'success');
      onClose();
    } catch (error) {
      console.error('Error sending quick reply:', error);
      showNotification('Failed to send message', 'error');
    }
  };

  return (
    <div className="modal active">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>💬 Quick Replies</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div>Loading quick replies...</div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quick replies..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--background-color)',
                    color: 'var(--text-color)'
                  }}
                />
              </div>

              {/* Quick Replies List */}
              {filteredReplies.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {filteredReplies.map(reply => (
                    <button
                      key={reply.id}
                      onClick={() => handleUseQuickReply(reply)}
                      style={{
                        padding: '1rem',
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--border-color)'}
                      onMouseLeave={(e) => e.target.style.background = 'var(--surface-color)'}
                    >
                      <span style={{ flex: 1 }}>{reply.text}</span>
                      {reply.shortcut && (
                        <span style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-color-secondary)',
                          background: 'var(--border-color)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          marginLeft: '0.5rem'
                        }}>
                          /{reply.shortcut}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)' }}>
                  {searchQuery ? 'No quick replies found' : 'No quick replies yet. Add them in Settings > Business Settings.'}
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-actions" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

