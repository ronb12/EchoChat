import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useChat } from '../hooks/useChat';

export default function Sidebar() {
  const { isSidebarOpen, openNewChatModal, toggleSidebar, closeSidebar } = useUI();
  const { chats = [], currentChatId, setCurrentChatId } = useChat();
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
                <li 
                  key={chat.id} 
                  className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                  onClick={() => handleChatClick(chat.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="chat-avatar">
                    <img
                      src={chat.avatar || '/icons/default-avatar.png'}
                      alt={chat.name}
                      onError={(e) => { e.target.src = '/icons/default-avatar.png'; }}
                    />
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">{chat.name || 'Unknown'}</div>
                    <div className="chat-preview">{chat.lastMessage || 'No messages'}</div>
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

