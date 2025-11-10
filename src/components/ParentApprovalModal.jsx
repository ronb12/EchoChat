import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { minorSafetyService } from '../services/minorSafetyService';

export default function ParentApprovalModal() {
  const { closeParentApprovalModal, showParentApprovalModal, showNotification } = useUI();
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (showParentApprovalModal && user) {
      loadPendingApprovals();
    }
  }, [showParentApprovalModal, user]);

  const loadPendingApprovals = async () => {
    if (!user) {return;}

    setLoading(true);
    try {
      const approvals = await minorSafetyService.getPendingApprovals(user.uid);
      setPendingApprovals(approvals);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      showNotification('Error loading approval requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId) => {
    if (!user) {return;}

    try {
      await minorSafetyService.approveContact(user.uid, approvalId);
      showNotification('Contact approved for your child', 'success');
      loadPendingApprovals();
    } catch (error) {
      console.error('Error approving contact:', error);
      showNotification('Error approving contact', 'error');
    }
  };

  const handleReject = async (approvalId) => {
    if (!user) {return;}

    try {
      await minorSafetyService.rejectContact(user.uid, approvalId);
      showNotification('Contact request rejected', 'success');
      loadPendingApprovals();
    } catch (error) {
      console.error('Error rejecting contact:', error);
      showNotification('Error rejecting contact', 'error');
    }
  };

  if (!showParentApprovalModal) {return null;}

  return (
    <div className="modal active" id="parent-approval-modal">
      <div className="modal-backdrop" onClick={closeParentApprovalModal}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>🔒 Parent Approval Required</h2>
          <button className="modal-close" onClick={closeParentApprovalModal}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{
            padding: '1rem',
            background: 'var(--warning-bg, #fff3cd)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              Your child has requested to add a contact. Please review and approve or reject each request.
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading approval requests...</p>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
              <p>No pending approval requests</p>
            </div>
          ) : (
            <div className="user-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="chat-item"
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--warning-color, #ffc107)'
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Child:</strong> {approval.minorUser?.displayName || approval.minorUser?.email || 'Unknown'}
                  </div>
                  <div className="chat-avatar" style={{ marginTop: '0.5rem' }}>
                    <img
                      src={approval.contactUser?.photoURL || approval.contactUser?.avatar || '/icons/default-avatar.png'}
                      alt={approval.contactUser?.name || 'User'}
                    />
                  </div>
                  <div className="chat-details" style={{ flex: 1 }}>
                    <div className="chat-name">
                      <strong>Requested Contact:</strong> {approval.contactUser?.displayName || approval.contactUser?.name || approval.contactUser?.email || 'Unknown User'}
                    </div>
                    <div className="chat-preview">
                      {approval.contactUser?.email || ''}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Requested: {new Date(approval.requestedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleApprove(approval.id)}
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleReject(approval.id)}
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={closeParentApprovalModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

