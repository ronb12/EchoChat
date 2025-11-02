import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { useRealtimeMessages, useTypingIndicator } from '../hooks/useRealtime';
import { chatService } from '../services/chatService';
import MessageBubble from './MessageBubble';

export default function ChatArea() {
  const { messages, setMessages } = useChat();
  const { user } = useAuth();
  const { openNewChatModal } = useUI();
  const [messageText, setMessageText] = useState('');
  const [currentChatId, setCurrentChatId] = useState('demo'); // Default chat ID
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(currentChatId);
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subscribe to real-time messages
  useRealtimeMessages(currentChatId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K to open new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openNewChatModal();
      }
      // Cmd/Ctrl + F to focus search (if search exists)
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openNewChatModal]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    
    // Create previews for images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newPreviews = [];
    
    if (imageFiles.length === 0) {
      setPreviewImages([]);
      return;
    }
    
    let loadedCount = 0;
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newPreviews.push({ file, url: event.target.result });
        loadedCount++;
        if (loadedCount === imageFiles.length) {
          setPreviewImages(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePreview = (index) => {
    const newPreviews = [...previewImages];
    const newFiles = [...selectedFiles];
    newPreviews.splice(index, 1);
    newFiles.splice(index, 1);
    setPreviewImages(newPreviews);
    setSelectedFiles(newFiles);
  };

  const handleEmojiClick = (emoji) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && selectedFiles.length === 0) || !user) return;

    try {
      // Send images first
      for (const preview of previewImages) {
        await chatService.sendMessage(currentChatId, {
          text: '',
          image: preview.url,
          imageName: preview.file.name,
          senderId: user.uid,
          senderName: user.displayName || user.email || 'User'
        });
      }

      // Send files
      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) {
          const fileData = {
            name: file.name,
            size: file.size,
            type: file.type
          };
          await chatService.sendMessage(currentChatId, {
            text: '',
            file: fileData,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'User'
          });
        }
      }

      // Send text message
      if (messageText.trim()) {
        await chatService.sendMessage(currentChatId, {
          text: messageText.trim(),
          senderId: user.uid,
          senderName: user.displayName || user.email || 'User'
        });
      }
      
      setMessageText('');
      setSelectedFiles([]);
      setPreviewImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      stopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Show welcome screen if no messages and no current chat
  if (messages.length === 0 && !currentChatId) {
    return (
      <div className="chat-area">
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="welcome-icon">💬</div>
            <h2>Welcome to EchoChat</h2>
            <p>Select a chat or start a new conversation to begin messaging</p>
            <div className="welcome-actions">
              <button className="btn btn-primary" onClick={openNewChatModal}>
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-interface">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-info">
            <div className="chat-avatar">
              <img src="/icons/default-avatar.png" alt="Chat" />
            </div>
            <div className="chat-details">
              <h3>Demo Chat</h3>
              <div className="chat-status">
                {Object.keys(typingUsers).length > 0 
                  ? `${Object.values(typingUsers)[0]?.displayName || 'Someone'} is typing...`
                  : 'Online'
                }
              </div>
            </div>
          </div>
          <div className="chat-actions">
            <button className="action-btn" title="Attach file">📎</button>
            <button className="action-btn" title="Voice call">📞</button>
            <button className="action-btn" title="More options">⋯</button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="messages-container">
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Start the conversation by sending a message!</p>
                <button className="btn btn-secondary" onClick={openNewChatModal}>
                  Start New Chat
                </button>
              </div>
            ) : (
              <>
                {messages.map((message, idx) => (
                  <MessageBubble 
                    key={message.id || idx} 
                    message={message}
                    isOwn={message.senderId === user?.uid}
                    chatId={currentChatId}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Image Previews */}
        {previewImages.length > 0 && (
          <div className="image-previews">
            {previewImages.map((preview, idx) => (
              <div key={idx} className="image-preview">
                <img src={preview.url} alt={preview.file.name} />
                <button 
                  className="remove-preview" 
                  onClick={() => removePreview(idx)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input */}
        <div className="message-input-container">
          <div className="input-actions">
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              style={{ display: 'none' }}
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            <button 
              className="input-action-btn" 
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              📎
            </button>
            <button 
              className="input-action-btn emoji-btn" 
              title="Add emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😀
            </button>
          </div>
          
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker" ref={emojiPickerRef}>
              <div className="emoji-picker-header">
                <span>Pick an emoji</span>
              </div>
              <div className="emoji-grid">
                {['😀', '😂', '🥰', '😍', '🤔', '😎', '🥳', '😊', '😢', '🤗', '😴', '🤮', 
                  '👍', '👎', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💯',
                  '🔥', '⭐', '🎉', '🎊', '🎁', '🏆', '👏', '🙌', '🤝', '💪', '🙏', '🤞'].map(emoji => (
                  <button
                    key={emoji}
                    className="emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="message-input-wrapper" style={{ flex: 1 }}>
            <input 
              id="message-input"
              type="text" 
              placeholder="Type a message..."
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
            />
            <button 
              type="submit" 
              className="send-btn"
              disabled={!messageText.trim() && selectedFiles.length === 0}
              title="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

