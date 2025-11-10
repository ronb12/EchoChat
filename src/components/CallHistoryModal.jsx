import React, { useEffect, useMemo, useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { callHistoryService } from '../services/callHistoryService';
import { profileService } from '../services/profileService';
import { getDisplayName } from '../utils/userDisplayName';

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

const formatStatus = (status) => {
  if (!status) {return 'Unknown';}
  const normalized = String(status).toLowerCase();
  switch (normalized) {
    case 'completed':
      return 'Connected';
    case 'remote-ended':
      return 'Ended by other person';
    case 'declined':
      return 'Declined';
    case 'failed':
      return 'Failed to connect';
    case 'missed':
      return 'Missed call';
    case 'in_progress':
      return 'In progress';
    default:
      return normalized.replace(/[-_]/g, ' ');
  }
};

const isGenericName = (value) => {
  if (!value) {return true;}
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {return true;}
  return normalized === 'user' ||
    normalized === 'contact' ||
    normalized === 'unknown' ||
    normalized === 'you' ||
    normalized === 'me';
};

export default function CallHistoryModal() {
  const { showCallHistoryModal, closeCallHistoryModal } = useUI();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileCache, setProfileCache] = useState({});

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
    const idsToFetch = [];
    const nameFallbacks = {};
    const immediateUpdates = {};

    entries.forEach((entry) => {
      const isCaller = entry.callerId === user.uid;
      const otherId = isCaller ? entry.receiverId : entry.callerId;
      if (!otherId) {return;}
      const storedName = isCaller ? entry.receiverName : entry.callerName;
      if (storedName && !isGenericName(storedName)) {
        nameFallbacks[otherId] = storedName;
        if (!profileCache[otherId]) {
          immediateUpdates[otherId] = {
            name: storedName,
            avatar: '/icons/default-avatar.png'
          };
        }
      }
      if (!profileCache[otherId]) {
        idsToFetch.push(otherId);
      }
    });

    if (Object.keys(immediateUpdates).length > 0) {
      setProfileCache((prev) => ({ ...immediateUpdates, ...prev }));
    }

    if (idsToFetch.length === 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      const updates = {};
      for (const otherId of idsToFetch) {
        if (!otherId) {continue;}
        try {
          const profile = await profileService.getUserProfile(otherId);
          const name = getDisplayName(profile, otherId);
          const resolvedName = !isGenericName(name) ? name : nameFallbacks[otherId];
          updates[otherId] = {
            name: resolvedName || otherId || 'Unknown',
            avatar: profile?.photoURL || profile?.avatar || '/icons/default-avatar.png'
          };
        } catch (_) {
          updates[otherId] = {
            name: nameFallbacks[otherId] || otherId || 'Unknown',
            avatar: '/icons/default-avatar.png'
          };
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setProfileCache((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entries, profileCache, user]);

  const enrichedEntries = useMemo(() => {
    if (!entries || !user?.uid) {return [];}
    return entries.map((entry) => {
      const isCaller = entry.callerId === user.uid;
      const otherPartyId = isCaller ? entry.receiverId : entry.callerId;
      const cached = profileCache[otherPartyId] || {};
      const storedName = isCaller ? entry.receiverName : entry.callerName;
      return {
        ...entry,
        otherPartyId,
        isCaller,
        otherPartyName: cached.name || (!isGenericName(storedName) ? storedName : null) || otherPartyId || 'Unknown',
        otherPartyAvatar: cached.avatar || '/icons/default-avatar.png'
      };
    });
  }, [entries, profileCache, user]);

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
      <div
        className="modal-content"
        style={{
          maxWidth: '1100px',
          width: 'min(95vw, 1100px)'
        }}
      >
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '260px' }}>
                          <img
                            src={entry.otherPartyAvatar}
                            alt={entry.otherPartyName}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid rgba(255,255,255,0.15)'
                            }}
                            onError={(event) => { event.currentTarget.src = '/icons/default-avatar.png'; }}
                          />
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {entry.otherPartyName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {(entry.callType || 'audio')}{' '}
                        <span style={{ opacity: 0.7 }}>
                          · {entry.isCaller ? 'Outgoing' : 'Incoming'}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {formatStatus(entry.status)}
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

