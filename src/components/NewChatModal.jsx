import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { chatService } from '../services/chatService';
import { firestoreService } from '../services/firestoreService';
import { contactService } from '../services/contactService';
import { minorSafetyService } from '../services/minorSafetyService';
import { db } from '../services/firebaseConfig';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export default function NewChatModal() {
  const { closeNewChatModal, closeSidebar, showNotification } = useUI();
  const { user } = useAuth();
  const { setCurrentChatId, setChats, chats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isMinor, setIsMinor] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]); // Track pending contact requests
  const [sendingRequest, setSendingRequest] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null); // User found from search

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Check if user is a minor
        const minorCheck = await minorSafetyService.isMinor(user.uid);
        setIsMinor(minorCheck);
        
        // Load blocked users, contacts, and pending requests
        const [blocked, userContacts] = await Promise.all([
          firestoreService.getBlockedUsers(user.uid),
          contactService.getContacts(user.uid)
        ]);

        const blockedIds = Array.isArray(blocked) ? blocked : [];
        const contactIds = userContacts.map(c => c.id);
        
        setBlockedUsers(blockedIds);
        setContacts(contactIds);
        
        // Load sent requests to show which users have pending requests
        try {
          const sentRequests = await contactService.getSentRequests(user.uid);
          const sentRequestIds = sentRequests.map(req => req.toUserId);
          setPendingRequests(sentRequestIds);
        } catch (error) {
          console.error('Error loading sent requests:', error);
          setPendingRequests([]);
        }

        // Set contacts as available users (for starting chats with existing contacts)
        setUsers(userContacts.map(c => ({
          id: c.id,
          name: c.displayName || c.name || c.email || 'Unknown User',
          email: c.email || '',
          avatar: c.photoURL || c.avatar || '/icons/default-avatar.png',
          isContact: true
        })));
      } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data. Please try again.', 'error');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleSearchUser = async () => {
    if (!searchQuery.trim() || !user) {
      showNotification('Please enter a username or email address', 'warning');
      return;
    }

    setSearching(true);
    setSearchedUser(null);
    setSelectedUser(null);

    try {
      const queryLower = searchQuery.trim().toLowerCase();
      const usersRef = collection(db, 'users');
      
      console.log('🔍 Searching for:', searchQuery);
      console.log('🔍 Query (lowercase):', queryLower);
      
      let foundUser = null;
      let allUsers = [];
      
      // Get all users and filter client-side for case-insensitive matching
      // This is more reliable than exact email matching
      try {
        console.log('📡 Fetching users from Firestore...');
        const usersSnapshot = await getDocs(usersRef);
        console.log('📊 Total users in database:', usersSnapshot.size);
        
        usersSnapshot.forEach((docSnap) => {
          const userData = docSnap.data();
          const userId = docSnap.id;
          
          // Log user data for debugging
          if (userData.email) {
            console.log(`  - User ${userId}: email="${userData.email}", displayName="${userData.displayName || userData.name || 'N/A'}"`);
          }
          
          // Skip current user and blocked users
          if (userId === user.uid || blockedUsers.includes(userId)) {
            return;
          }
          
          const email = (userData.email || '').toLowerCase().trim();
          const displayName = (userData.displayName || userData.name || '').toLowerCase().trim();
          
          // Store user info for debugging
          allUsers.push({
            id: userId,
            email: email,
            displayName: displayName,
            originalEmail: userData.email || ''
          });
          
          // Match by exact email (case-insensitive) or partial match
          const emailMatches = email === queryLower || email.includes(queryLower);
          const nameMatches = displayName.includes(queryLower);
          
          if (emailMatches || nameMatches) {
            console.log('✅ Match found!', {
              userId,
              email: userData.email,
              displayName: userData.displayName || userData.name,
              emailMatches,
              nameMatches
            });
            
            const isContact = contacts.includes(userId);
            foundUser = {
              id: userId,
              name: userData.displayName || userData.name || userData.email || 'Unknown User',
              email: userData.email || '',
              avatar: userData.photoURL || userData.avatar || '/icons/default-avatar.png',
              isContact: isContact
            };
          }
        });
        
      console.log('📋 All users checked:', allUsers.length);
      console.log('✅ Found user:', foundUser ? 'YES' : 'NO');
      
      if (!foundUser) {
        console.log('❌ No match found. Searched users:', allUsers.map(u => ({
          email: u.originalEmail,
          displayName: u.displayName || 'N/A'
        })));
        console.log('💡 Tip: User might exist in Firebase Auth but not in Firestore.');
        console.log('   Make sure the user has completed signup and has a Firestore document.');
        console.log('   Check Firestore console: users collection');
      }
      } catch (searchError) {
        console.error('❌ Error searching users:', searchError);
        console.error('Error code:', searchError.code);
        console.error('Error message:', searchError.message);
        console.error('Error stack:', searchError.stack);
        
        // Check if it's a permissions error
        if (searchError.code === 'permission-denied') {
          showNotification('Permission denied. Please check your account permissions.', 'error');
        } else {
          showNotification('Error searching for user. Please try again.', 'error');
        }
        setSearching(false);
        return;
      }

      if (foundUser) {
        setSearchedUser(foundUser);
        setSelectedUser(foundUser);
        console.log('✅ User found and selected:', foundUser);
      } else {
        console.log('❌ User not found for query:', searchQuery);
        console.log('💡 Possible reasons:');
        console.log('   1. User exists in Firebase Auth but not in Firestore');
        console.log('   2. User needs to complete signup to create Firestore document');
        console.log('   3. Email/username is misspelled');
        console.log('   4. User has not signed up yet');
        console.log('');
        console.log('📋 To fix:');
        console.log('   - Have the user log in at least once to create their Firestore document');
        console.log('   - Or manually create the user document in Firestore console');
        console.log('   - Check Firestore: users collection');
        
        const errorMsg = `User not found. The user may exist in authentication but not in the database. 
        Have them complete signup or log in once to create their profile.`;
        showNotification(errorMsg, 'warning');
        setSearchedUser(null);
      }
    } catch (error) {
      console.error('❌ Fatal error searching user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      showNotification('Error searching for user. Please try again.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const filteredUsers = users.filter(u => {
    // Exclude current user
    if (u.id === user?.uid) return false;
    
    // Exclude blocked users
    if (blockedUsers.includes(u.id)) return false;
    
    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleSendContactRequest = async () => {
    if (!searchedUser || !user) return;
    
    console.log('📤 handleSendContactRequest called:', {
      fromUserId: user.uid,
      fromUserEmail: user.email,
      toUserId: searchedUser.id,
      toUserEmail: searchedUser.email,
      toUserName: searchedUser.name,
      fromUserIdType: typeof user.uid,
      toUserIdType: typeof searchedUser.id,
      fromUserIdLength: user.uid?.length,
      toUserIdLength: searchedUser.id?.length
    });
    
    // Check if already a contact
    if (searchedUser.isContact) {
      showNotification('This user is already a contact', 'info');
      return;
    }
    
    // Check if request already sent
    if (pendingRequests.includes(searchedUser.id)) {
      showNotification('Contact request already sent. Waiting for approval.', 'info');
      return;
    }
    
    setSendingRequest(true);
    try {
      console.log('📤 Calling contactService.sendContactRequest with:', {
        fromUserId: user.uid,
        toUserId: searchedUser.id
      });
      
      const result = await contactService.sendContactRequest(user.uid, searchedUser.id);
      
      console.log('📤 sendContactRequest result:', result);
      
      if (result.success) {
        showNotification('Contact request sent successfully!', 'success');
        // Add to pending requests list
        setPendingRequests([...pendingRequests, searchedUser.id]);
        // Update searchedUser to show pending status
        setSearchedUser({ ...searchedUser });
      } else {
        console.error('❌ sendContactRequest failed:', result.error);
        showNotification(result.error || 'Failed to send contact request', 'error');
      }
    } catch (error) {
      console.error('❌ Error sending contact request:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      showNotification('Error sending contact request. Please try again.', 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCreateChat = async () => {
    if (!selectedUser || !user) {return;}

    // Safety check for minors
    if (isMinor) {
      const canChat = await minorSafetyService.canChat(user.uid, selectedUser.id);
      if (!canChat.canChat) {
        showNotification(canChat.reason || 'Parent approval required for this contact', 'warning');
        return;
      }
    }

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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Enter username or email address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchedUser(null);
                  setSelectedUser(null);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchUser();
                  }
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleSearchUser}
                disabled={!searchQuery.trim() || searching}
                style={{ minWidth: '100px' }}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Enter a username or email address to find and send a contact request
            </p>
          </div>

          <div className="user-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Loading...</p>
              </div>
            ) : searchedUser ? (
              // Show searched user result
              <div
                className="chat-item selected"
                style={{ padding: '1rem', cursor: 'default' }}
              >
                <div className="chat-avatar">
                  <img src={searchedUser.avatar || '/icons/default-avatar.png'} alt={searchedUser.name} />
                </div>
                <div className="chat-details" style={{ flex: 1 }}>
                  <div className="chat-name">
                    {searchedUser.name}
                    {searchedUser.isContact && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                        ✓ Contact
                      </span>
                    )}
                    {pendingRequests.includes(searchedUser.id) && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--warning-color, #ffc107)' }}>
                        ⏳ Request Pending
                      </span>
                    )}
                  </div>
                  <div className="chat-preview">{searchedUser.email}</div>
                </div>
              </div>
            ) : filteredUsers.length > 0 ? (
              // Show existing contacts (if searching within contacts)
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
                    <div className="chat-name">
                      {userOption.name}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                        ✓ Contact
                      </span>
                    </div>
                    <div className="chat-preview">{userOption.email}</div>
                  </div>
                  {selectedUser?.id === userOption.id && (
                    <span style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>✓</span>
                  )}
                </div>
              ))
            ) : searchQuery.trim() ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No user found. Try searching with a different username or email.</p>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Enter a username or email address above to search for a user.</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  You can only chat with users who have approved your contact request.
                </p>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={closeNewChatModal}>
              Cancel
            </button>
            {searchedUser && (
              <>
                {/* Show "Send Contact Request" button if user is not a contact and request not sent */}
                {!searchedUser.isContact && !pendingRequests.includes(searchedUser.id) && (
                  <button
                    className="btn btn-primary"
                    onClick={handleSendContactRequest}
                    disabled={sendingRequest}
                  >
                    {sendingRequest ? 'Sending...' : '📤 Send Contact Request'}
                  </button>
                )}
                {/* Show "Start Chat" button if user is a contact */}
                {searchedUser.isContact && (
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateChat}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Start Chat'}
                  </button>
                )}
              </>
            )}
            {selectedUser && !searchedUser && selectedUser.isContact && (
              <button
                className="btn btn-primary"
                onClick={handleCreateChat}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Start Chat'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
