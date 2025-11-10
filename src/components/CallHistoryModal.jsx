import React, { useEffect, useMemo, useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { callHistoryService } from '../services/callHistoryService';

const formatTimestamp = (timestamp) => {
  if (!timestamp) {return 'Unknown';}
  let date;
  try {
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
  } catch (error) {
    return 'Unknown';
  }
  return date.toLocaleString();
};

const formatDuration = (seconds) => {
  if (seconds === null || typeof seconds === 'undefined') {
    return '—';
  }
  const value = Number(seconds);
  if (Number.isNaN(value) || value < 0) {
    return '—';
  }
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

export default function CallHistoryModal() {
  const { showCallHistoryModal, closeCallHistoryModal } = useUI();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nameCache, setNameCache] = useState({});

  useEffect(() => {
    if (!showCallHistoryModal || !user?.uid) {
      setEntries([]);
      return;
    }

    setLoading(true);
    const unsubscribe = callHistoryService.subscribeToUserHistory(user.uid, (records) => {
      setEntries(records || []);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showCallHistoryModal, user]);

  useEffect(() => {
    if (!entries || !user?.uid) {return;}
    const uniqueUserIds = new Set();
    entries.forEach((entry) => {
      const isCaller = entry.callerId === user.uid;
      const otherPartyId = isCaller ? entry.receiverId : entry.callerId;
      if (otherPartyId && !nameCache[otherPartyId]) {
        uniqueUserIds.add(otherPartyId);
      }
    });

    if (uniqueUserIds.size === 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      const { profileService } = await import('../services/profileService');
      const { getDisplayName } = await import('../utils/userDisplayName');

      const updates = {};
      for (const otherId of uniqueUserIds) {
        try {
          const profile = await profileService.getUserProfile(otherId);
          const name = getDisplayName(profile, otherId);
          updates[otherId] = name || otherId;
        } catch (error) {
          updates[otherId] = otherId || 'Unknown';
        }
      }

      if (!cancelled) {
        setNameCache((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entries, nameCache, user]);

  const enrichedEntries = useMemo(() => {
    if (!entries || !user?.uid) {return [];}
    return entries.map((entry) => {
      const isCaller = entry.callerId === user.uid;
      const otherPartyId = isCaller ? entry.receiverId : entry.callerId;
      return {
        ...entry,
        otherPartyId,
        isCaller,
        otherPartyName: nameCache[otherPartyId] || otherPartyId || 'Unknown'
      };
    });
  }, [entries, nameCache, user]);

  if (!showCallHistoryModal) {
    return null;
  }

  return (
    <div
      className="modal active"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeCallHistoryModal();
        }
      }}
    >
      <div className="modal-content" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <h2>Call History</h2>
          <button className="modal-close" onClick={closeCallHistoryModal}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p>Loading your recent calls…</p>
            </div>
          ) : enrichedEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No calls yet</h3>
              <p style={{ opacity: 0.8 }}>
                Once you start a call, it will appear here with its status and duration.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="call-history-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Contact</th>
                    <th style={{ textAlign: 'left' }}>Type</th>
                    <th style={{ textAlign: 'left' }}>Status</th>
                    <th style={{ textAlign: 'left' }}>Started</th>
                    <th style={{ textAlign: 'left' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        {entry.otherPartyId || 'Unknown'}
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                          {entry.callerId === user.uid ? 'You → Them' : 'Them → You'}
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {entry.callType || 'audio'}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {entry.status?.replace(/[-_]/g, ' ') || 'completed'}
                      </td>
                      <td>{formatTimestamp(entry.startedAt)}</td>
                      <td>{formatDuration(entry.durationSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

