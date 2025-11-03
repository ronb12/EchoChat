import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services/chatService';

export default function GroupChatModal() {
  const { closeGroupChatModal } = useUI();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load available users (in production, fetch from Firebase)
    const demoUsers = [
      { id: 'user1', name: 'John Doe', email: 'john@example.com', avatar: '/icons/default-avatar.png' },
      { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', avatar: '/icons/default-avatar.png' },
      { id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', avatar: '/icons/default-avatar.png' },
      { id: 'user4', name: 'Alice Williams', email: 'alice@example.com', avatar: '/icons/default-avatar.png' }
    ];
    setUsers(demoUsers.filter(u => u.id !== user?.uid));
  }, [user]);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (userOption) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === userOption.id);
      if (exists) {
        return prev.filter(u => u.id !== userOption.id);
      } else {
        return [...prev, userOption];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || !user) {return;}

    try {
      const participants = [user.uid, ...selectedUsers.map(u => u.id)];
      const chat = await chatService.createChat(participants, groupName.trim(), true);
      console.log('Group created:', chat);
      closeGroupChatModal();
      setGroupName('');
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <div className="modal active" id="group-chat-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create Group Chat</h2>
          <button className="modal-close" onClick={closeGroupChatModal}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="group-name">Group Name</label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <div className="form-group">
            <label>Select Members</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="user-select" style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '1rem' }}>
              {filteredUsers.map(userOption => (
                <div
                  key={userOption.id}
                  className={`chat-item ${selectedUsers.find(u => u.id === userOption.id) ? 'selected' : ''}`}
                  onClick={() => toggleUserSelection(userOption)}
                  style={{ cursor: 'pointer', padding: '0.75rem', marginBottom: '0.5rem' }}
                >
                  <div className="chat-avatar">
                    <img src={userOption.avatar || '/icons/default-avatar.png'} alt={userOption.name} />
                  </div>
                  <div className="chat-details" style={{ flex: 1 }}>
                    <div className="chat-name">{userOption.name}</div>
                    <div className="chat-preview">{userOption.email}</div>
                  </div>
                  {selectedUsers.find(u => u.id === userOption.id) && (
                    <span style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>✓</span>
                  )}
                </div>
              ))}
            </div>
            {selectedUsers.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                <strong>Selected ({selectedUsers.length}):</strong> {selectedUsers.map(u => u.name).join(', ')}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={closeGroupChatModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0}
            >
              Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

