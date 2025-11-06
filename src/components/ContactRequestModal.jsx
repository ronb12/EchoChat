import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { contactService } from '../services/contactService';

export default function ContactRequestModal() {
  const { closeContactRequestModal, showContactRequestModal, showNotification } = useUI();
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'

  // Load sent requests
  const loadSentRequests = useCallback(async () => {
    if (!user) return;
    
    try {
      const requests = await contactService.getSentRequests(user.uid);
      // Fetch user details for each sent request
      const requestsWithUsers = await Promise.all(
        requests.map(async (request) => {
          try {
            const { db } = await import('../services/firebaseConfig');
            const { doc, getDoc } = await import('firebase/firestore');
            const userDoc = await getDoc(doc(db, 'users', request.toUserId));
            if (userDoc.exists()) {
              return {
                ...request,
                toUser: { id: userDoc.id, ...userDoc.data() }
              };
            }
            return request;
          } catch (error) {
            console.error('Error fetching user for sent request:', error);
            return request;
          }
        })
      );
      setSentRequests(requestsWithUsers);
    } catch (error) {
      console.error('Error loading sent requests:', error);
      setSentRequests([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      setSentRequests([]);
      return;
    }

    let unsubscribe = null;
    let isMounted = true;

    if (showContactRequestModal) {
      setLoading(true);
      
      // Load sent requests
      loadSentRequests();
      
      // Set up real-time listener for immediate updates
      unsubscribe = contactService.subscribeToPendingRequests(user.uid, (requests) => {
        if (isMounted) {
          setPendingRequests(requests);
          setLoading(false);
          console.log('📬 ContactRequestModal: Updated with', requests.length, 'pending requests');
        }
      });
    }

    // Cleanup on unmount or when modal closes
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showContactRequestModal, user, loadSentRequests]);

  const handleAccept = async (requestId) => {
    if (!user) return;
    
    try {
      await contactService.acceptContactRequest(user.uid, requestId);
      showNotification('Contact request accepted', 'success');
      loadPendingRequests();
    } catch (error) {
      console.error('❌ Error accepting request:', error);
      console.error('   Error message:', error?.message || 'No message');
      console.error('   Error code:', error?.code || 'No code');
      console.error('   Error name:', error?.name || 'No name');
      const errorMessage = error?.message || error?.code || 'Unknown error';
      showNotification(`Error accepting request: ${errorMessage}`, 'error');
    }
  };

  const handleReject = async (requestId) => {
    if (!user) return;
    
    try {
      await contactService.rejectContactRequest(user.uid, requestId);
      showNotification('Contact request rejected', 'success');
      // Real-time listener will update automatically
    } catch (error) {
      console.error('Error rejecting request:', error);
      showNotification('Error rejecting request', 'error');
    }
  };

  const handleDeleteSentRequest = async (toUserId) => {
    if (!user) return;
    
    try {
      const result = await contactService.deleteContactRequest(user.uid, toUserId);
      if (result.success) {
        showNotification('Contact request deleted', 'success');
        loadSentRequests(); // Reload sent requests
      } else {
        showNotification(result.error || 'Failed to delete request', 'error');
      }
    } catch (error) {
      console.error('Error deleting sent request:', error);
      showNotification('Error deleting request', 'error');
    }
  };

  const handleResendRequest = async (toUserId) => {
    if (!user) return;
    
    try {
      // First delete the old request
      await contactService.deleteContactRequest(user.uid, toUserId);
      
      // Wait a bit for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send a new request
      const result = await contactService.sendContactRequest(user.uid, toUserId);
      if (result.success) {
        showNotification('Contact request resent', 'success');
        loadSentRequests(); // Reload sent requests
      } else {
        showNotification(result.error || 'Failed to resend request', 'error');
      }
    } catch (error) {
      console.error('Error resending request:', error);
      showNotification('Error resending request', 'error');
    }
  };

  if (!showContactRequestModal) return null;

  return (
    <div className="modal active" id="contact-request-modal">
      <div className="modal-backdrop" onClick={closeContactRequestModal}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Contact Requests</h2>
          <button className="modal-close" onClick={closeContactRequestModal}>&times;</button>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <button
            className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'received' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'received' ? 'white' : 'var(--text-color)',
              border: 'none',
              cursor: 'pointer',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}
          >
            Received ({pendingRequests.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'sent' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'sent' ? 'white' : 'var(--text-color)',
              border: 'none',
              cursor: 'pointer',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}
          >
            Sent ({sentRequests.length})
          </button>
        </div>

        <div className="modal-body">
          {loading && activeTab === 'received' ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading requests...</p>
            </div>
          ) : activeTab === 'received' ? (
            pendingRequests.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No pending contact requests</p>
              </div>
            ) : (
              <div className="user-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="chat-item"
                    style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}
                  >
                    <div className="chat-avatar">
                      <img
                        src={request.fromUser?.photoURL || request.fromUser?.avatar || '/icons/default-avatar.png'}
                        alt={request.fromUser?.name || 'User'}
                      />
                    </div>
                    <div className="chat-details" style={{ flex: 1 }}>
                      <div className="chat-name">
                        {request.fromUser?.displayName || request.fromUser?.name || request.fromUser?.email || 'Unknown User'}
                      </div>
                      <div className="chat-preview">
                        {request.fromUser?.email || ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAccept(request.id)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleReject(request.id)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Sent requests tab
            sentRequests.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No sent contact requests</p>
              </div>
            ) : (
              <div className="user-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="chat-item"
                    style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}
                  >
                    <div className="chat-avatar">
                      <img
                        src={request.toUser?.photoURL || request.toUser?.avatar || '/icons/default-avatar.png'}
                        alt={request.toUser?.name || 'User'}
                      />
                    </div>
                    <div className="chat-details" style={{ flex: 1 }}>
                      <div className="chat-name">
                        {request.toUser?.displayName || request.toUser?.name || request.toUser?.email || 'Unknown User'}
                      </div>
                      <div className="chat-preview">
                        {request.toUser?.email || ''}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          (Pending)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleResendRequest(request.toUserId)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        title="Resend contact request"
                      >
                        ↻ Resend
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteSentRequest(request.toUserId)}
                        style={{ 
                          fontSize: '0.875rem', 
                          padding: '0.5rem 1rem',
                          background: '#f44336',
                          color: 'white',
                          border: 'none'
                        }}
                        title="Delete contact request"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={closeContactRequestModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

