import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { useDisplayName } from '../hooks/useDisplayName';
import { chatService } from '../services/chatService';

export default function ForwardModal({ config, onClose }) {
  const { chats } = useChat();
  const { user } = useAuth();
  const { showNotification } = useUI();
  const displayName = useDisplayName(user?.uid, user?.displayName || user?.email || 'You');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [isForwarding, setIsForwarding] = useState(false);

  const availableChats = useMemo(() => {
    if (!Array.isArray(chats)) {
      return [];
    }
    return chats.filter((chat) => chat?.id && chat.id !== config?.fromChatId);
  }, [chats, config?.fromChatId]);

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return availableChats;
    }
    return availableChats.filter((chat) => {
      const name = (chat.alias || chat.displayName || chat.name || 'Chat').toLowerCase();
      return name.includes(term);
    });
  }, [availableChats, searchTerm]);

  if (!config) {
    return null;
  }

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
  };

  const handleForward = async () => {
    if (!selectedChatId) {
      showNotification('Select a chat to forward the message.', 'info');
      return;
    }
    if (!user?.uid) {
      showNotification('You must be signed in to forward messages.', 'error');
      return;
    }
    if (!config.message) {
      showNotification('Unable to forward this message.', 'error');
      return;
    }

    setIsForwarding(true);
    try {
      await chatService.forwardMessage(
        config.message,
        config.fromChatId,
        selectedChatId,
        user.uid,
        displayName || 'You'
      );
      showNotification('Message forwarded', 'success');
      onClose();
    } catch (error) {
      console.error('Error forwarding message:', error);
      showNotification(error?.message || 'Failed to forward message.', 'error');
    } finally {
      setIsForwarding(false);
    }
  };

  const renderMessagePreview = () => {
    const message = config.message || {};
    const parts = [];
    if (message.text || message.decryptedText) {
      parts.push((message.decryptedText || message.text || '').slice(0, 120));
    }
    if (message.image) {
      parts.push('📷 Photo');
    }
    if (message.video) {
      parts.push('🎥 Video');
    }
    if (message.audio) {
      parts.push('🎵 Voice message');
    }
    if (message.fileName) {
      parts.push(`📎 ${message.fileName}`);
    }
    if (message.isPoll) {
      parts.push('📊 Poll');
    }
    return parts.length > 0 ? parts.join(' · ') : 'Message preview unavailable';
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3200
      }}
      onClick={onClose}
    >
      <div
        className="modal-content forward-modal"
        style={{
          background: 'var(--background-color)',
          borderRadius: '16px',
          width: 'min(480px, 92%)',
          padding: '24px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Forward message</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-color)',
              fontSize: '22px',
              cursor: 'pointer'
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          style={{
            background: 'rgba(0, 132, 255, 0.1)',
            border: '1px solid rgba(0, 132, 255, 0.2)',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '14px',
            lineHeight: 1.6
          }}
        >
          <strong>Preview:</strong> {renderMessagePreview()}
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search chats..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'var(--surface-color)',
            color: 'var(--text-color)'
          }}
        />

        <div
          style={{
            flex: 1,
            minHeight: '0',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {filteredChats.length === 0 ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                opacity: 0.7,
                fontSize: '14px'
              }}
            >
              No chats found
            </div>
          ) : (
            filteredChats.map((chat) => {
              const name = chat.alias || chat.displayName || chat.name || 'Chat';
              const isSelected = selectedChatId === chat.id;
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => handleSelectChat(chat.id)}
                  className={`forward-chat-item ${isSelected ? 'selected' : ''}`}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid rgba(0, 0, 0, 0.08)',
                    background: isSelected ? 'rgba(0, 132, 255, 0.12)' : 'rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    color: 'var(--text-color)'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{name}</div>
                  {chat.lastMessage && (
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>
                      {chat.lastMessageSenderName ? `${chat.lastMessageSenderName}: ` : ''}
                      {chat.lastMessage}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              cursor: 'pointer'
            }}
            disabled={isForwarding}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={!selectedChatId || isForwarding}
            style={{
              padding: '10px 18px',
              background: selectedChatId ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
              borderRadius: '10px',
              border: 'none',
              color: '#fff',
              cursor: selectedChatId ? 'pointer' : 'not-allowed',
              boxShadow: selectedChatId ? '0 10px 20px rgba(0, 132, 255, 0.25)' : 'none',
              opacity: isForwarding ? 0.7 : 1
            }}
          >
            {isForwarding ? 'Forwarding…' : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  );
}

ForwardModal.propTypes = {
  config: PropTypes.shape({
    message: PropTypes.object,
    fromChatId: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};

