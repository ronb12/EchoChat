import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';

function GroupChatModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { createChat } = useChat();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // In a real app, you'd fetch this from your user service
  const [availableUsers] = useState([]); // TODO: Fetch from users service

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert('Please enter a group name and select at least one member');
      return;
    }

    const result = await createChat(
      selectedUsers.map(u => u.id),
      groupName,
      true // isGroup
    );

    if (result.success) {
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h2>New Group Chat</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <div className="form-group">
            <label>Add Members</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
            />
            <div className="selected-members">
              {selectedUsers.map(user => (
                <span key={user.id} className="selected-member">
                  {user.name}
                  <button onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}>×</button>
                </span>
              ))}
            </div>
            <button 
              className="btn-primary"
              onClick={handleCreateGroup}
              style={{ marginTop: '16px', width: '100%' }}
            >
              Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupChatModal;

