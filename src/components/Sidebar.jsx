import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useChat } from '../hooks/useChat';
import { useRealtimeChats } from '../hooks/useRealtime';
import { useAuth } from '../hooks/useAuth';
import { useDisplayName } from '../hooks/useDisplayName';

function ChatListRow({ chat, isActive, onSelect, currentUserId }) {
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

  return (
    <li
      className={`chat-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(chat.id)}
      style={{ cursor: 'pointer' }}
    >
      <div className="chat-avatar">
        <img
          src={avatarSrc}
          alt={chatDisplayName}
          onError={(e) => { e.target.src = '/icons/default-avatar.png'; }}
        />
      </div>
      <div className="chat-info">
        <div className="chat-name">{chatDisplayName}</div>
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
    </li>
  );
}

export default function Sidebar() {
  const { isSidebarOpen, openNewChatModal, toggleSidebar, closeSidebar } = useUI();
  const { chats = [], currentChatId, setCurrentChatId } = useChat();
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

