import React, { useState, useEffect, useRef } from 'react';
import { useUI } from '../hooks/useUI';
import { useChat } from '../hooks/useChat';
import { useRealtimeChats } from '../hooks/useRealtime';
import { useAuth } from '../hooks/useAuth';
import { useDisplayName } from '../hooks/useDisplayName';
import { chatService } from '../services/chatService';

const ACTION_WIDTH = 128;
const MIN_SWIPE_DISTANCE_TOUCH = 45;
const CLOSE_SWIPE_DISTANCE_TOUCH = 35;

function ChatListRow({
  chat,
  isActive,
  onSelect,
  currentUserId,
  onToggleMute,
  onDelete,
  isMuted
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const pointerStartRef = useRef(null);
  const pointerCurrentRef = useRef(null);
  const pointerIdRef = useRef(null);
  const pointerTypeRef = useRef(null);
  const pointerLastTypeRef = useRef(null);
  const suppressClickRef = useRef(false);

  const participants = Array.isArray(chat?.participants) ? chat.participants : [];
  const otherParticipantId = chat?.type === 'group'
    ? null
    : participants.find((participantId) => participantId && participantId !== currentUserId);
  const baseChatName = chat?.alias || chat?.displayName || chat?.name || 'Unknown';
  const chatDisplayName = chat?.type === 'group'
    ? (chat?.name || baseChatName)
    : useDisplayName(otherParticipantId, baseChatName);

  const lastMessageSenderId = chat?.lastMessageSenderId && chat.lastMessageSenderId !== currentUserId
    ? chat.lastMessageSenderId
    : null;
  const lastMessageSenderName = useDisplayName(
    lastMessageSenderId,
    chat?.lastMessageSenderName || (lastMessageSenderId ? 'Someone' : '')
  );
  const previewText = chat?.lastMessage
    ? (lastMessageSenderId && lastMessageSenderName
        ? `${lastMessageSenderName}: ${chat.lastMessage}`
        : chat.lastMessage)
    : 'No messages';

  const avatarSrc = chat?.avatar || '/icons/default-avatar.png';

  const resetPosition = () => {
    setOffsetX(0);
    setIsOpen(false);
    suppressClickRef.current = false;
  };

  const openActions = () => {
    setOffsetX(-ACTION_WIDTH);
    setIsOpen(true);
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {return;}
    pointerIdRef.current = event.pointerId;
    const type = event.pointerType || 'mouse';
    pointerTypeRef.current = type;
    pointerLastTypeRef.current = type;
    pointerStartRef.current = event.clientX;
    pointerCurrentRef.current = event.clientX;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
      // ignore capture errors (e.g., not supported)
    }
  };

  const handlePointerMove = (event) => {
    if (pointerIdRef.current !== event.pointerId) {return;}
    if (pointerTypeRef.current === 'mouse' && (event.buttons & 1) !== 1) {return;}

    const currentX = event.clientX;
    const delta = currentX - pointerStartRef.current;
    if (delta < 0) {
      setOffsetX(Math.max(delta, -ACTION_WIDTH - 32));
      if (pointerTypeRef.current === 'touch' && delta <= -MIN_SWIPE_DISTANCE_TOUCH) {
        openActions();
        suppressClickRef.current = true;
      }
    } else if (isOpen) {
      if (pointerTypeRef.current === 'touch') {
        setOffsetX(Math.min(delta - ACTION_WIDTH, 0));
      } else {
        setOffsetX(0);
      }
    } else {
      setOffsetX(0);
    }
    pointerCurrentRef.current = currentX;
    event.preventDefault();
  };

  const handlePointerUp = (event) => {
    if (pointerIdRef.current !== event.pointerId) {return;}

    const start = pointerStartRef.current ?? 0;
    const current = pointerCurrentRef.current ?? start;
    const delta = current - start;
    if (pointerTypeRef.current === 'touch') {
      if (!isOpen && delta <= -MIN_SWIPE_DISTANCE_TOUCH) {
        openActions();
        suppressClickRef.current = true;
      } else if (isOpen && delta >= CLOSE_SWIPE_DISTANCE_TOUCH) {
        resetPosition();
      } else if (isOpen) {
        openActions();
      } else {
        resetPosition();
      }
    } else {
      if (!isOpen && delta < -20) {
        openActions();
        suppressClickRef.current = true;
      } else if (isOpen && delta > 20) {
        resetPosition();
      }
    }
    pointerStartRef.current = null;
    pointerCurrentRef.current = null;
    pointerIdRef.current = null;
    pointerTypeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore capture errors
    }
  };

  const handleRowClick = (event) => {
    if (event) {
      event.stopPropagation();
    }
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const lastPointerType = pointerLastTypeRef.current;
    if (lastPointerType === 'mouse') {
      if (!isOpen) {
        openActions();
        suppressClickRef.current = true;
      } else {
        resetPosition();
      }
      return;
    }
    if (isOpen) {
      return;
    }
    onSelect(chat.id);
    pointerLastTypeRef.current = null;
  };

  const handleMute = (event) => {
    event.stopPropagation();
    onToggleMute(chat.id);
    resetPosition();
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete(chat.id);
    resetPosition();
  };

  const actionsClassName = `chat-item-actions${isOpen ? ' visible' : ''}`;

  return (
    <li className="chat-item-container">
      <div className={actionsClassName} aria-hidden={!isOpen}>
        <button
          className="chat-action-btn mute-btn"
          type="button"
          onClick={handleMute}
          aria-label={isMuted ? 'Unmute chat' : 'Mute chat'}
        >
          <span className="chat-action-icon">{isMuted ? '🔔' : '🔕'}</span>
        </button>
        <button
          className="chat-action-btn delete-btn"
          type="button"
          onClick={handleDelete}
          aria-label="Delete chat"
        >
          <span className="chat-action-icon">🗑️</span>
        </button>
      </div>
      <div
        className={`chat-item ${isActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}
        onClick={handleRowClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${offsetX}px)` }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleRowClick(event);
          }
          if (event.key === 'Escape' && isOpen) {
            resetPosition();
          }
        }}
      >
        <div className="chat-avatar">
          <img
            src={avatarSrc}
            alt={chatDisplayName}
            onError={(e) => { e.target.src = '/icons/default-avatar.png'; }}
          />
        </div>
        <div className="chat-info">
          <div className="chat-name">
            {chatDisplayName}
            {isMuted && <span className="chat-muted-indicator" title="Notifications silenced">🔕</span>}
          </div>
          <div className="chat-preview">{previewText}</div>
        </div>
        <div className="chat-meta">
          {chat.lastMessageAt && (
            <div className="chat-time">
              {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {chat.unreadCount && chat.unreadCount > 0 && (
            <div className="unread-count">{chat.unreadCount}</div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Sidebar() {
  const { isSidebarOpen, openNewChatModal, toggleSidebar, closeSidebar } = useUI();
  const {
    chats = [],
    currentChatId,
    setCurrentChatId,
    mutedChats,
    toggleMuteChat,
    setChats,
    unmuteChat
  } = useChat();
  const { user } = useAuth();
  // Initialize chats from service
  useRealtimeChats();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when a chat is selected (even if changed from elsewhere)
  useEffect(() => {
    if (isMobile && currentChatId && isSidebarOpen) {
      closeSidebar();
    }
  }, [currentChatId, isMobile, isSidebarOpen, closeSidebar]);

  const handleChatClick = (chatId) => {
    if (setCurrentChatId && chatId) {
      setCurrentChatId(chatId);
    }
    // Close sidebar on mobile when chat is selected
    if (isMobile) {
      closeSidebar();
    }
  };

  const handleToggleMute = (chatId) => {
    toggleMuteChat(chatId);
  };

  const handleDeleteChat = async (chatId) => {
    if (!chatId) {return;}
    const confirmation = window.confirm('Delete this chat and all of its messages? This cannot be undone.');
    if (!confirmation) {return;}
    try {
      await chatService.deleteChat(chatId);
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
      unmuteChat(chatId);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      alert('Unable to delete this chat. Please try again.');
    }
  };

  return (
    <>
      {/* Backdrop overlay on mobile when sidebar is open AND no chat is selected */}
      {isSidebarOpen && !currentChatId && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
        />
      )}
      <aside className={`sidebar ${isSidebarOpen && !currentChatId ? 'open' : ''} ${currentChatId ? 'hidden' : ''}`}>
      <div className="sidebar-header">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search chats..."
          />
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3>Chats</h3>
          <ul className="chat-list">
            {chats.length === 0 ? (
              <li style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No chats yet
              </li>
            ) : (
              chats.map((chat) => (
                <ChatListRow
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  onSelect={handleChatClick}
                  currentUserId={user?.uid}
                  onToggleMute={handleToggleMute}
                  onDelete={handleDeleteChat}
                  isMuted={mutedChats?.includes(chat.id)}
                />
              ))
            )}
          </ul>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="new-chat-btn" onClick={openNewChatModal}>
          <span>+</span>
          <span>New Chat</span>
        </button>
      </div>
      </aside>
    </>
  );
}

