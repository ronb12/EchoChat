import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { minorSafetyService } from '../services/minorSafetyService';
import { contactService } from '../services/contactService';
import { firestoreService } from '../services/firestoreService';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function ParentDashboard() {
  const { closeParentDashboard, showParentDashboard, showNotification } = useUI();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, contacts, activity, requests
  const [minorAccounts, setMinorAccounts] = useState([]);
  const [selectedMinor, setSelectedMinor] = useState(null);
  const [minorContacts, setMinorContacts] = useState([]);
  const [minorActivity, setMinorActivity] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [monitoringSettings, setMonitoringSettings] = useState({
    messageAlerts: true,
    contactAlerts: true,
    safetyAlerts: true,
    activityMonitoring: true
  });

  useEffect(() => {
    if (showParentDashboard && user) {
      loadMinorAccounts();
    }
  }, [showParentDashboard, user]);

  useEffect(() => {
    if (selectedMinor) {
      loadMinorData();
      setupRealtimeUpdates();
    }
    return () => {
      // Cleanup realtime listeners
    };
  }, [selectedMinor]);

  const loadMinorAccounts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Find all minor accounts linked to this parent
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('parentId', '==', user.uid)
      );
      const snapshot = await getDocs(q);

      const minors = [];
      snapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        if (userData.isMinor === true) {
          minors.push({
            id: docSnap.id,
            ...userData
          });
        }
      });

      setMinorAccounts(minors);
      
      // Auto-select first minor if available
      if (minors.length > 0 && !selectedMinor) {
        setSelectedMinor(minors[0].id);
      }
    } catch (error) {
      console.error('Error loading minor accounts:', error);
      showNotification('Error loading child accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMinorData = async () => {
    if (!selectedMinor) return;

    try {
      // Load contacts
      const contacts = await contactService.getContacts(selectedMinor);
      setMinorContacts(contacts);

      // Load pending approvals
      const approvals = await minorSafetyService.getPendingApprovals(user.uid);
      const minorApprovals = approvals.filter(a => a.minorUserId === selectedMinor);
      setPendingApprovals(minorApprovals);

      // Load recent activity
      await loadMinorActivity();

      // Load safety alerts
      await loadSafetyAlerts();
    } catch (error) {
      console.error('Error loading minor data:', error);
      showNotification('Error loading child data', 'error');
    }
  };

  const loadMinorActivity = async () => {
    if (!selectedMinor) return;

    try {
      // Get recent chats for the minor
      const chatsRef = collection(db, 'chats');
      const chatsQuery = query(
        chatsRef,
        where('participants', 'array-contains', selectedMinor),
        orderBy('lastMessageAt', 'desc'),
        limit(20)
      );
      const chatsSnapshot = await getDocs(chatsQuery);

      const activity = [];
      for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data();
        
        // Get other participant info
        const otherParticipantId = chatData.participants.find(p => p !== selectedMinor);
        let otherUser = null;
        if (otherParticipantId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
            if (userDoc.exists()) {
              otherUser = {
                id: userDoc.id,
                ...userDoc.data()
              };
            }
          } catch (error) {
            console.error('Error loading user:', error);
          }
        }

        // Get recent messages
        const messagesRef = collection(db, 'chats', chatDoc.id, 'messages');
        const messagesQuery = query(
          messagesRef,
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const recentMessages = [];
        messagesSnapshot.forEach((msgDoc) => {
          recentMessages.push({
            id: msgDoc.id,
            ...msgDoc.data()
          });
        });

        activity.push({
          chatId: chatDoc.id,
          chatName: chatData.name || otherUser?.displayName || 'Unknown',
          otherUser,
          lastMessageAt: chatData.lastMessageAt,
          recentMessages: recentMessages.reverse(),
          messageCount: recentMessages.length
        });
      }

      setMinorActivity(activity.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0)));
    } catch (error) {
      console.error('Error loading minor activity:', error);
      setMinorActivity([]);
    }
  };

  const loadSafetyAlerts = async () => {
    if (!selectedMinor) return;

    try {
      // Get reports involving this minor
      const reportsRef = collection(db, 'reports');
      const reportsQuery = query(
        reportsRef,
        where('reportedUserId', '==', selectedMinor),
        orderBy('reportedAt', 'desc'),
        limit(10)
      );
      const reportsSnapshot = await getDocs(reportsQuery);

      const alerts = [];
      reportsSnapshot.forEach((docSnap) => {
        alerts.push({
          id: docSnap.id,
          type: 'report',
          ...docSnap.data()
        });
      });

      // Get blocked users (if minor blocked someone or was blocked)
      const blockedRef = collection(db, 'blocked');
      const blockedQuery = query(
        blockedRef,
        where('userId', '==', selectedMinor),
        orderBy('blockedAt', 'desc'),
        limit(10)
      );
      const blockedSnapshot = await getDocs(blockedQuery);

      blockedSnapshot.forEach((docSnap) => {
        alerts.push({
          id: docSnap.id,
          type: 'block',
          ...docSnap.data()
        });
      });

      setSafetyAlerts(alerts);
    } catch (error) {
      console.error('Error loading safety alerts:', error);
    }
  };

  const setupRealtimeUpdates = () => {
    if (!selectedMinor) return;

    // Listen for new contact requests
    const approvalsRef = collection(db, 'parentApprovals');
    const approvalsQuery = query(
      approvalsRef,
      where('parentId', '==', user.uid),
      where('minorUserId', '==', selectedMinor),
      where('status', '==', 'pending')
    );

    const unsubscribeApprovals = onSnapshot(approvalsQuery, (snapshot) => {
      const approvals = [];
      snapshot.forEach((docSnap) => {
        approvals.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setPendingApprovals(approvals);
    });

    // Listen for new messages (if monitoring enabled)
    if (monitoringSettings.messageAlerts) {
      const chatsRef = collection(db, 'chats');
      const chatsQuery = query(
        chatsRef,
        where('participants', 'array-contains', selectedMinor)
      );

      const unsubscribeChats = onSnapshot(chatsQuery, () => {
        loadMinorActivity();
      });

      return () => {
        unsubscribeApprovals();
        unsubscribeChats();
      };
    }

    return () => {
      unsubscribeApprovals();
    };
  };

  const handleApproveContact = async (approvalId) => {
    try {
      await minorSafetyService.approveContact(user.uid, approvalId);
      showNotification('Contact approved', 'success');
      loadMinorData();
    } catch (error) {
      console.error('Error approving contact:', error);
      showNotification('Error approving contact', 'error');
    }
  };

  const handleRejectContact = async (approvalId) => {
    try {
      await minorSafetyService.rejectContact(user.uid, approvalId);
      showNotification('Contact request rejected', 'success');
      loadMinorData();
    } catch (error) {
      console.error('Error rejecting contact:', error);
      showNotification('Error rejecting contact', 'error');
    }
  };

  const handleRemoveContact = async (contactId) => {
    if (!selectedMinor) return;
    
    if (!window.confirm('Are you sure you want to remove this contact? The child will no longer be able to chat with them.')) {
      return;
    }

    try {
      await contactService.removeContact(selectedMinor, contactId);
      showNotification('Contact removed', 'success');
      loadMinorData();
    } catch (error) {
      console.error('Error removing contact:', error);
      showNotification('Error removing contact', 'error');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!showParentDashboard) return null;

  return (
    <div className="modal active" id="parent-dashboard-modal">
      <div className="modal-backdrop" onClick={closeParentDashboard}></div>
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2>🔒 Parent Dashboard</h2>
          <button className="modal-close" onClick={closeParentDashboard}>&times;</button>
        </div>

        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
          {/* Sidebar - Minor Accounts */}
          <div style={{ 
            width: '200px', 
            borderRight: '1px solid var(--border-color)',
            padding: '1rem',
            overflowY: 'auto',
            background: 'var(--background-color, transparent)'
          }}>
            <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'white' }}>
              Children Accounts
            </h3>
            {loading ? (
              <p style={{ color: 'var(--text-primary, #333)' }}>Loading...</p>
            ) : minorAccounts.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'white' }}>
                No child accounts linked
              </p>
            ) : (
              minorAccounts.map((minor) => (
                <div
                  key={minor.id}
                  onClick={() => setSelectedMinor(minor.id)}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedMinor === minor.id ? 'var(--primary-color)' : 'transparent',
                    color: selectedMinor === minor.id ? 'white' : 'var(--text-primary)',
                    border: `1px solid ${selectedMinor === minor.id ? 'var(--primary-color)' : 'var(--border-color)'}`
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                    {minor.displayName || minor.name || minor.email || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    {minor.email}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!selectedMinor ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Select a child account to view activity</p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{ 
                  display: 'flex', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--background-color, transparent)'
                }}>
                  {['overview', 'contacts', 'activity', 'requests', 'alerts'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '1rem',
                        border: 'none',
                        background: activeTab === tab ? 'var(--surface-color, rgba(0, 132, 255, 0.1))' : 'transparent',
                        borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        fontWeight: activeTab === tab ? 'bold' : 'normal',
                        color: 'var(--text-primary, #333)'
                      }}
                    >
                      {tab === 'requests' ? 'Contact Requests' : tab}
                      {tab === 'requests' && pendingApprovals.length > 0 && (
                        <span style={{ 
                          marginLeft: '0.5rem',
                          background: 'var(--primary-color)',
                          color: 'white',
                          borderRadius: '50%',
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.75rem'
                        }}>
                          {pendingApprovals.length}
                        </span>
                      )}
                      {tab === 'alerts' && safetyAlerts.length > 0 && (
                        <span style={{ 
                          marginLeft: '0.5rem',
                          background: 'var(--error-color, red)',
                          color: 'white',
                          borderRadius: '50%',
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.75rem'
                        }}>
                          {safetyAlerts.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                  {activeTab === 'overview' && (
                    <div>
                      <h3 style={{ marginBottom: '1rem' }}>Overview</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                            {minorContacts.length}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                            Approved Contacts
                          </div>
                        </div>
                        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning-color, #ffc107)' }}>
                            {pendingApprovals.length}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                            Pending Requests
                          </div>
                        </div>
                        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                            {minorActivity.length}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                            Active Chats
                          </div>
                        </div>
                        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: safetyAlerts.length > 0 ? 'var(--error-color, red)' : 'var(--success-color, green)' }}>
                            {safetyAlerts.length}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                            Safety Alerts
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '2rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Recent Activity</h4>
                        {minorActivity.length === 0 ? (
                          <p style={{ color: 'var(--text-primary, #333)' }}>No recent activity</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {minorActivity.slice(0, 5).map((activity) => (
                              <div key={activity.chatId} style={{ 
                                padding: '1rem', 
                                background: 'var(--bg-secondary)', 
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontWeight: 'bold' }}>{activity.chatName}</div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                                    Last active: {formatTimestamp(activity.lastMessageAt)}
                                  </div>
                                </div>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => setActiveTab('activity')}
                                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                >
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'contacts' && (
                    <div>
                      <h3 style={{ marginBottom: '1rem' }}>Approved Contacts</h3>
                      {minorContacts.length === 0 ? (
                        <p style={{ color: 'var(--text-primary, #333)' }}>No approved contacts</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {minorContacts.map((contact) => (
                            <div key={contact.id} style={{ 
                              padding: '1rem', 
                              background: 'var(--bg-secondary)', 
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <img 
                                  src={contact.photoURL || contact.avatar || '/icons/default-avatar.png'} 
                                  alt={contact.name}
                                  style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                                />
                                <div>
                                  <div style={{ fontWeight: 'bold' }}>
                                    {contact.displayName || contact.name || contact.email || 'Unknown'}
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                                    {contact.email}
                                  </div>
                                </div>
                              </div>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleRemoveContact(contact.id)}
                                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'activity' && (
                    <div>
                      <h3 style={{ marginBottom: '1rem' }}>Messaging Activity</h3>
                      {minorActivity.length === 0 ? (
                        <p style={{ color: 'var(--text-primary, #333)' }}>No messaging activity</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {minorActivity.map((activity) => (
                            <div key={activity.chatId} style={{ 
                              padding: '1rem', 
                              background: 'var(--bg-secondary)', 
                              borderRadius: '8px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div style={{ fontWeight: 'bold' }}>{activity.chatName}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                                  {formatTimestamp(activity.lastMessageAt)}
                                </div>
                              </div>
                              {activity.recentMessages.length > 0 && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)', marginTop: '0.5rem' }}>
                                  Recent messages: {activity.recentMessages.length}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'requests' && (
                    <div>
                      <h3 style={{ marginBottom: '1rem' }}>Pending Contact Requests</h3>
                      {pendingApprovals.length === 0 ? (
                        <p style={{ color: 'var(--text-primary, #333)' }}>No pending requests</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {pendingApprovals.map((approval) => (
                            <div key={approval.id} style={{ 
                              padding: '1rem', 
                              background: 'var(--bg-secondary)', 
                              borderRadius: '8px',
                              borderLeft: '4px solid var(--warning-color, #ffc107)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <img 
                                    src={approval.contactUser?.photoURL || approval.contactUser?.avatar || '/icons/default-avatar.png'} 
                                    alt={approval.contactUser?.name}
                                    style={{ width: '50px', height: '50px', borderRadius: '50%' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 'bold' }}>
                                      {approval.contactUser?.displayName || approval.contactUser?.name || approval.contactUser?.email || 'Unknown'}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)' }}>
                                      {approval.contactUser?.email}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-primary, #333)', marginTop: '0.25rem' }}>
                                      Requested: {formatTimestamp(approval.requestedAt)}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => handleApproveContact(approval.id)}
                                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                  >
                                    ✅ Approve
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => handleRejectContact(approval.id)}
                                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                  >
                                    ❌ Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'alerts' && (
                    <div>
                      <h3 style={{ marginBottom: '1rem' }}>Safety Alerts</h3>
                      {safetyAlerts.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary, #333)' }}>
                          <p>✅ No safety alerts</p>
                          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            Your child's account is safe
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {safetyAlerts.map((alert) => (
                            <div key={alert.id} style={{ 
                              padding: '1rem', 
                              background: alert.type === 'report' ? 'var(--error-bg, #ffebee)' : 'var(--warning-bg, #fff3cd)', 
                              borderRadius: '8px',
                              borderLeft: `4px solid ${alert.type === 'report' ? 'var(--error-color, red)' : 'var(--warning-color, #ffc107)'}`
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                {alert.type === 'report' ? '🚨 Report' : '🚫 Block'}
                              </div>
                              {alert.reason && (
                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                  Reason: {alert.reason}
                                </div>
                              )}
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-primary, #333)' }}>
                                {formatTimestamp(alert.reportedAt || alert.blockedAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem' }}>
          <button className="btn btn-secondary" onClick={closeParentDashboard}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

