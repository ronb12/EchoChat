import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { contactService } from '../services/contactService';

export default function ContactRequestModal() {
  const { closeContactRequestModal, showContactRequestModal, showNotification } = useUI();
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      return;
    }

    let unsubscribe = null;
    let isMounted = true;

    if (showContactRequestModal) {
      setLoading(true);
      
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
  }, [showContactRequestModal, user]);

  const handleAccept = async (requestId) => {
    if (!user) return;
    
    try {
      await contactService.acceptContactRequest(user.uid, requestId);
      showNotification('Contact request accepted', 'success');
      loadPendingRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      showNotification('Error accepting request', 'error');
    }
  };

  const handleReject = async (requestId) => {
    if (!user) return;
    
    try {
      await contactService.rejectContactRequest(user.uid, requestId);
      showNotification('Contact request rejected', 'success');
      loadPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showNotification('Error rejecting request', 'error');
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
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading requests...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
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

