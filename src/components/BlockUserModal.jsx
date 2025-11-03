import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';

export default function BlockUserModal({ userId, userName }) {
  const { closeBlockUserModal } = useUI();
  const { user } = useAuth();
  const [reportReason, setReportReason] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!user || !userId) return;

    setLoading(true);
    try {
      await firestoreService.blockUser(user.uid, userId);
      closeBlockUserModal();
      // Show notification
      alert(`You have blocked ${userName || 'this user'}`);
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Error blocking user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!user || !userId || !reportReason.trim()) return;

    setLoading(true);
    try {
      await firestoreService.reportUser(user.uid, userId, reportReason.trim());
      closeBlockUserModal();
      alert('User reported. Thank you for your report.');
    } catch (error) {
      console.error('Error reporting user:', error);
      alert('Error reporting user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" id="block-user-modal">
      <div className="modal-backdrop" onClick={closeBlockUserModal}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Block or Report User</h2>
          <button className="modal-close" onClick={closeBlockUserModal}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1.5rem' }}>
            What would you like to do with <strong>{userName || 'this user'}</strong>?
          </p>

          {!showReportForm ? (
            <>
              <div className="form-group">
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginBottom: '1rem' }}
                  onClick={handleBlock}
                  disabled={loading}
                >
                  🚫 Block User
                </button>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Blocked users won't be able to send you messages or see your profile.
                </p>
              </div>

              <div className="form-group">
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setShowReportForm(true)}
                  disabled={loading}
                >
                  📢 Report User
                </button>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Report inappropriate behavior or content.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="report-reason">Reason for reporting</label>
                <textarea
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please describe the issue..."
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowReportForm(false)}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleReport}
                  disabled={!reportReason.trim() || loading}
                >
                  {loading ? 'Reporting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

