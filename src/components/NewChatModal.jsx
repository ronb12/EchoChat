import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { chatService } from '../services/chatService';

export default function NewChatModal() {
  const { closeNewChatModal, closeSidebar } = useUI();
  const { user } = useAuth();
  const { setCurrentChatId, setChats, chats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Load available users (in production, fetch from Firebase)
    // For now, use demo users
    const demoUsers = [
      { id: 'user1', name: 'John Doe', email: 'john@example.com', avatar: '/icons/default-avatar.png' },
      { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', avatar: '/icons/default-avatar.png' },
      { id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', avatar: '/icons/default-avatar.png' },
      { id: 'test-business-1', name: 'Test Business Account', email: 'business@echochat.com', avatar: '/icons/default-avatar.png' }
    ];
    setUsers(demoUsers);
  }, []);

  const filteredUsers = users.filter(u =>
    u.id !== user?.uid && (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleCreateChat = async () => {
    if (!selectedUser || !user) {return;}

    setCreating(true);
    try {
      const chat = await chatService.createChat([user.uid, selectedUser.id], selectedUser.name, false);
      console.log('Chat created:', chat);

      // The chat should already have the correct name since we passed selectedUser.name to createChat
      // But we need to ensure the avatar is set. Since userIdToChats is private, we'll rely on
      // the manual setChats call for immediate update, and useRealtimeChats polling will sync later

      // Add chat to chats list (useRealtimeChats will pick this up via polling)
      const newChat = {
        id: chat.id,
        name: selectedUser.name,
        avatar: selectedUser.avatar,
        lastMessage: null,
        lastMessageAt: chat.createdAt,
        unreadCount: 0,
        type: 'direct'
      };

      // Update chats state - ensure we don't add duplicates
      // Check if chat already exists before adding
      const chatExists = chats.some(c => c.id === chat.id);
      if (!chatExists) {
        setChats([...chats, newChat]);
      }

      // Set as current chat
      setCurrentChatId(chat.id);

      // Close modal
      closeNewChatModal();

      // Close sidebar on mobile to show the chat
      if (isMobile) {
        closeSidebar();
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal active" id="new-chat-modal">
      <div className="modal-backdrop" onClick={closeNewChatModal}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Start New Chat</h2>
          <button className="modal-close" onClick={closeNewChatModal}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <input
              type="text"
              className="search-input"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="user-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {filteredUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map(userOption => (
                <div
                  key={userOption.id}
                  className={`chat-item ${selectedUser?.id === userOption.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(userOption)}
                  style={{ cursor: 'pointer', padding: '1rem' }}
                >
                  <div className="chat-avatar">
                    <img src={userOption.avatar || '/icons/default-avatar.png'} alt={userOption.name} />
                  </div>
                  <div className="chat-details" style={{ flex: 1 }}>
                    <div className="chat-name">{userOption.name}</div>
                    <div className="chat-preview">{userOption.email}</div>
                  </div>
                  {selectedUser?.id === userOption.id && (
                    <span style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>✓</span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={closeNewChatModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateChat}
              disabled={!selectedUser || creating}
            >
              {creating ? 'Creating...' : 'Start Chat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
