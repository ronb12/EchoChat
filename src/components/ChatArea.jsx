import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { useRealtimeMessages, useTypingIndicator } from '../hooks/useRealtime';
import { chatService } from '../services/chatService';
import { validationService } from '../services/validationService';
import { firestoreService } from '../services/firestoreService';
import { videoMessageService } from '../services/videoMessageService';
import { stickersService } from '../services/stickersService';
import { groupPollsService } from '../services/groupPollsService';
import MessageBubble from './MessageBubble';
import VoiceRecorder from './VoiceRecorder';
import MessageSearch from './MessageSearch';
import GifPicker from './GifPicker';
import MediaGallery from './MediaGallery';
import SendMoneyModal from './SendMoneyModal';
import QuickReplyModal from './QuickReplyModal';
import PollCreatorModal from './PollCreatorModal';
import { EMOJI_LIST } from '../data/emojis';

export default function ChatArea() {
  const { messages, currentChatId, setCurrentChatId } = useChat();
  const { user } = useAuth();
  const { openNewChatModal, openCallModal, toggleSidebar, openSettingsModal, openGroupChatModal, openMediaGallery, openStatusModal, showNotification } = useUI();
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false);
  const [showQuickReplyModal, setShowQuickReplyModal] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [availableStickers, setAvailableStickers] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const moreMenuRef = useRef(null);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(currentChatId);
  
  // Track mobile state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if business account
  useEffect(() => {
    if (user) {
      const accountType = localStorage.getItem('echochat_account_type') || user.accountType;
      const isBusiness = accountType === 'business' || user.isBusinessAccount === true;
      setIsBusinessAccount(isBusiness);
    }
  }, [user]);

  // Load stickers when picker is shown
  useEffect(() => {
    if (showStickerPicker) {
      stickersService.getStickerPacks().then(packs => {
        const allStickers = packs.flatMap(pack => pack.stickers || []);
        setAvailableStickers(allStickers.slice(0, 30));
      }).catch(() => {
        // Fallback to default emojis
        setAvailableStickers([]);
      });
    }
  }, [showStickerPicker]);

  // Close emoji picker and more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target) && showMoreMenu) {
        setShowMoreMenu(false);
      }
    };
    // Use click event instead of mousedown to avoid conflicts with button clicks
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

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
      // Cmd/Ctrl + F to toggle search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openNewChatModal, setShowSearch]);

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

  const handleVoiceRecordingComplete = async (audioBlob) => {
    if (!user) {return;}

    try {
      // Convert blob to base64 for storage (in production, upload to Firebase Storage)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        await chatService.sendMessage(currentChatId, {
          text: '',
          audio: base64Audio,
          audioName: `voice_${Date.now()}.webm`,
          senderId: user.uid,
          senderName: user.displayName || user.email || 'User'
        });
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && selectedFiles.length === 0) || !user) {
      return;
    }

    try {
      // Validate message text
      if (messageText.trim()) {
        const textValidation = validationService.validateMessage(messageText.trim());
        if (!textValidation.valid) {
          alert(textValidation.error);
          return;
        }
      }

      // Validate files
      for (const file of selectedFiles) {
        const fileValidation = validationService.validateFile(file);
        if (!fileValidation.valid) {
          alert(fileValidation.error);
          return;
        }
      }

      // Send images first
      for (const preview of previewImages) {
        const fileValidation = validationService.validateFile(preview.file);
        if (!fileValidation.valid) {
          alert(`Invalid image: ${fileValidation.error}`);
          continue;
        }

        try {
          await chatService.sendMessage(currentChatId, {
            text: '',
            image: preview.url,
            imageName: preview.file.name,
            fileSize: preview.file.size,
            fileType: preview.file.type,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'User'
          });
        } catch (error) {
          alert(`Error sending image: ${error.message || 'Unknown error'}`);
        }
      }

      // Send files
      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) {
          const fileValidation = validationService.validateFile(file);
          if (!fileValidation.valid) {
            alert(`Invalid file: ${fileValidation.error}`);
            continue;
          }

          try {
            const fileData = {
              name: file.name,
              size: file.size,
              type: file.type
            };
            await chatService.sendMessage(currentChatId, {
              text: '',
              file: fileData,
              fileSize: file.size,
              fileType: file.type,
              fileName: file.name,
              senderId: user.uid,
              senderName: user.displayName || user.email || 'User'
            });
          } catch (error) {
            alert(`Error sending file: ${error.message || 'Unknown error'}`);
          }
        }
      }

      // Send text message
      if (messageText.trim()) {
        try {
          await chatService.sendMessage(currentChatId, {
            text: validationService.sanitizeInput(messageText.trim()),
            senderId: user.uid,
            senderName: user.displayName || user.email || 'User'
          });
        } catch (error) {
          alert(`Error sending message: ${error.message || 'Unknown error'}`);
          return;
        }
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
      alert('An error occurred while sending your message. Please try again.');
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
      <div 
        className="chat-area"
        data-has-chat="false"
      >
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
    <div 
      className={`chat-area ${currentChatId ? 'has-chat' : ''}`}
      data-has-chat={currentChatId ? 'true' : 'false'}
    >
      <div className="chat-interface">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-info">
            {/* Back button on mobile - shows sidebar and clears chat selection */}
            {isMobile && (
              <button 
                className="back-button mobile-only"
                onClick={() => {
                  setCurrentChatId(null);
                  toggleSidebar();
                }}
                data-testid="back-button"
                aria-label="Back to chats"
              >
                ←
              </button>
            )}
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
            <button
              className="action-btn"
              title="Search messages"
              onClick={() => setShowSearch((prev) => !prev)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <button
              className="action-btn action-btn-call"
              title="Voice call"
              onClick={() => openCallModal('audio')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <button
              className="action-btn action-btn-video"
              title="Video call"
              onClick={() => openCallModal('video')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 11l-7-5v10l7-5z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </button>
            <div className="action-btn-wrapper" ref={moreMenuRef} style={{ position: 'relative' }}>
              <button 
                className="action-btn action-btn-more" 
                title="More options"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
              {showMoreMenu && (
                <div className="more-menu" style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '8px',
                  background: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '160px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMediaGallery();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>🖼️</span>
                    <span>View Media & Files</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSearch(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>🔍</span>
                    <span>Search Messages</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGroupChatModal();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>👥</span>
                    <span>Create Group Chat</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStatusModal();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>✏️</span>
                    <span>Status Updates</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!videoMessageService.isSupported()) {
                        showNotification('Video recording is not supported on this device', 'error');
                        setShowMoreMenu(false);
                        return;
                      }
                      try {
                        await videoMessageService.startRecording(currentChatId, user?.uid, (size) => {
                          console.log('Recording size:', size);
                        });
                        setIsRecordingVideo(true);
                        setShowVideoRecorder(true);
                        showNotification('Video recording started', 'success');
                      } catch (error) {
                        showNotification(`Error starting video recording: ${error.message}`, 'error');
                      }
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>📹</span>
                    <span>Video Message</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStickerPicker(!showStickerPicker);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>😊</span>
                    <span>Stickers</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPollCreator(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>📊</span>
                    <span>Create Poll</span>
                  </button>
                  {isBusinessAccount && (
                    <button
                      className="more-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuickReplyModal(true);
                        setShowMoreMenu(false);
                      }}
                    >
                      <span>💬</span>
                      <span>Quick Reply</span>
                    </button>
                  )}
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSendMoneyModal(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>💵</span>
                    <span>Send Money</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (currentChatId && messages.length > 0) {
                        if (window.confirm(`Are you sure you want to clear all ${messages.length} messages from this chat? This action cannot be undone.`)) {
                          try {
                            await chatService.clearChatHistory(currentChatId);
                            showNotification('Chat history cleared', 'success');
                          } catch (error) {
                            showNotification('Failed to clear chat history', 'error');
                            console.error('Error clearing chat:', error);
                          }
                        }
                      }
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>🗑️</span>
                    <span>Clear Chat History</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        const chatData = {
                          chatId: currentChatId,
                          messages: messages,
                          timestamp: new Date().toISOString()
                        };
                        const dataStr = JSON.stringify(chatData, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `chat-export-${currentChatId || 'chat'}-${Date.now()}.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                        showNotification('Chat exported successfully', 'success');
                      } catch (error) {
                        showNotification('Failed to export chat', 'error');
                        console.error('Error exporting chat:', error);
                      }
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>💾</span>
                    <span>Export Chat</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSettingsModal();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentChatId) {
                        if (window.confirm('Are you sure you want to leave this chat?')) {
                          setCurrentChatId(null);
                          showNotification('Left chat', 'info');
                        }
                      }
                      setShowMoreMenu(false);
                    }}
                    style={{ color: '#f44336' }}
                  >
                    <span>🚪</span>
                    <span>Leave Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Search */}
        {showSearch && (
          <MessageSearch />
        )}

        {/* Send Money Modal */}
        {showSendMoneyModal && (
          <SendMoneyModal
            recipientId={currentChatId}
            recipientName="Demo Chat"
            onClose={() => setShowSendMoneyModal(false)}
          />
        )}

        {/* Quick Reply Modal */}
        {showQuickReplyModal && (
          <QuickReplyModal onClose={() => setShowQuickReplyModal(false)} />
        )}

        {/* Sticker Picker */}
        {showStickerPicker && (
          <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '400px',
            overflowY: 'auto',
            background: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
            gap: '12px',
            zIndex: 2000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}>
            {availableStickers.length > 0 ? (
              availableStickers.map((sticker, idx) => (
                <button
                  key={sticker.id || idx}
                  onClick={async () => {
                    try {
                      await stickersService.sendSticker(
                        currentChatId,
                        user?.uid,
                        user?.displayName || user?.email || 'User',
                        sticker
                      );
                      setShowStickerPicker(false);
                      showNotification('Sticker sent!', 'success');
                    } catch (error) {
                      showNotification(`Error sending sticker: ${error.message}`, 'error');
                    }
                  }}
                  style={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {sticker.emoji || '😊'}
                </button>
              ))
            ) : (
              ['😊', '❤️', '😂', '👍', '🎉', '🔥', '💯', '🎈', '🎁', '🎂', '🎃', '🎄', '🎅', '🤖', '👾', '🦄'].map((emoji, idx) => (
                <button
                  key={`fallback-${idx}`}
                  onClick={async () => {
                    try {
                      await stickersService.sendSticker(
                        currentChatId,
                        user?.uid,
                        user?.displayName || user?.email || 'User',
                        { emoji, id: `sticker-${idx}`, packId: 'default' }
                      );
                      setShowStickerPicker(false);
                      showNotification('Sticker sent!', 'success');
                    } catch (error) {
                      showNotification(`Error sending sticker: ${error.message}`, 'error');
                    }
                  }}
                  style={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {emoji}
                </button>
              ))
            )}
            <button
              onClick={() => setShowStickerPicker(false)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'var(--border-color)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Poll Creator Modal */}
        {showPollCreator && (
          <PollCreatorModal
            chatId={currentChatId}
            userId={user?.uid}
            userName={user?.displayName || user?.email || 'User'}
            onClose={() => setShowPollCreator(false)}
            onSuccess={() => {
              setShowPollCreator(false);
              showNotification('Poll created!', 'success');
            }}
          />
        )}

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
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false);
              }}
            >
              😀
            </button>
                        <VoiceRecorder onRecordingComplete={handleVoiceRecordingComplete} />
            <button
              className="input-action-btn money-btn"
              title="Send Money"
              onClick={() => {
                if (currentChatId) {
                  setShowSendMoneyModal(true);
                } else {
                  showNotification('Please select a chat first', 'info');
                }
              }}
              style={{ color: '#4caf50' }}
            >
              💵
            </button>
            {showGifPicker && (
              <GifPicker
                onSelectGif={async (gifUrl) => {
                  try {
                    await chatService.sendMessage(currentChatId, {
                      text: '',
                      image: gifUrl,
                      imageName: 'gif.gif',
                      senderId: user.uid,
                      senderName: user.displayName || user.email || 'User'
                    });
                    setShowGifPicker(false);
                  } catch (error) {
                    alert('Error sending GIF: ' + (error.message || 'Unknown error'));
                  }
                }}
                onClose={() => setShowGifPicker(false)}
              />
            )}
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker" ref={emojiPickerRef}>
              <div className="emoji-picker-header">
                <span>Pick an emoji</span>
              </div>
              <div className="emoji-grid">
                {EMOJI_LIST.map(emoji => (
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
