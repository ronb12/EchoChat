import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/adminService';

export default function AdminDashboard() {
  const { closeAdminDashboard, showAdminDashboard, showNotification } = useUI();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (showAdminDashboard && user) {
      checkAdminStatus();
    }
  }, [showAdminDashboard, user]);

  const checkAdminStatus = async () => {
    if (!user) {return;}

    setLoading(true);
    try {
      const admin = await adminService.isAdmin(user.uid, user.email);
      setIsAdmin(admin);

      if (admin) {
        loadOverview();
      } else {
        showNotification('Access denied. Admin privileges required.', 'error');
        setTimeout(() => closeAdminDashboard(), 2000);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      showNotification('Error checking admin status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    setLoadingData(true);
    try {
      const adminStats = await adminService.getAdminStats();
      setStats(adminStats);
    } catch (error) {
      console.error('Error loading admin stats:', error);
      showNotification('Error loading statistics', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const loadRatings = async () => {
    setLoadingData(true);
    try {
      const allRatings = await adminService.getAllRatings(100);
      setRatings(allRatings);
    } catch (error) {
      console.error('Error loading ratings:', error);
      showNotification('Error loading ratings', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const loadFeatureRequests = async () => {
    setLoadingData(true);
    try {
      const allRequests = await adminService.getAllFeatureRequests(null, 100);
      setFeatureRequests(allRequests);
    } catch (error) {
      console.error('Error loading feature requests:', error);
      showNotification('Error loading feature requests', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const loadSupportTickets = async () => {
    setLoadingData(true);
    try {
      const allTickets = await adminService.getAllSupportTickets(null, null, 100);
      setSupportTickets(allTickets);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      showNotification('Error loading support tickets', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' && stats === null && isAdmin) {
      loadOverview();
    } else if (activeTab === 'ratings' && ratings.length === 0 && isAdmin) {
      loadRatings();
    } else if (activeTab === 'feature-requests' && featureRequests.length === 0 && isAdmin) {
      loadFeatureRequests();
    } else if (activeTab === 'support-tickets' && supportTickets.length === 0 && isAdmin) {
      loadSupportTickets();
    }
  }, [activeTab, isAdmin]);

  if (!showAdminDashboard) {return null;}

  if (loading) {
    return (
      <div className="modal active" id="admin-dashboard-modal">
        <div className="modal-backdrop" onClick={closeAdminDashboard}></div>
        <div className="modal-content" style={{ maxWidth: '1200px', height: '90vh' }}>
          <div className="modal-header">
            <h2>Admin Dashboard</h2>
            <button className="modal-close" onClick={closeAdminDashboard}>&times;</button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Checking admin access...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const formatDate = (timestamp) => {
    if (!timestamp) {return 'N/A';}
    return new Date(timestamp).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#F44336',
      urgent: '#9C27B0'
    };
    return colors[priority] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#F44336',
      pending: '#FF9800',
      resolved: '#4CAF50',
      closed: '#9E9E9E'
    };
    return colors[status] || '#666';
  };

  return (
    <div className="modal active" id="admin-dashboard-modal">
      <div className="modal-backdrop" onClick={closeAdminDashboard}></div>
      <div className="modal-content" style={{ maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>🔐 Admin Dashboard</h2>
          <button className="modal-close" onClick={closeAdminDashboard}>&times;</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: activeTab === 'overview' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'overview' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              borderBottom: activeTab === 'overview' ? '3px solid var(--primary-color)' : '3px solid transparent'
            }}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: activeTab === 'ratings' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'ratings' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              borderBottom: activeTab === 'ratings' ? '3px solid var(--primary-color)' : '3px solid transparent'
            }}
          >
            Ratings ({stats?.ratings?.total || 0})
          </button>
          <button
            className={`tab-button ${activeTab === 'feature-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('feature-requests')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: activeTab === 'feature-requests' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'feature-requests' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              borderBottom: activeTab === 'feature-requests' ? '3px solid var(--primary-color)' : '3px solid transparent'
            }}
          >
            Feature Requests ({stats?.featureRequests?.total || 0})
          </button>
          <button
            className={`tab-button ${activeTab === 'support-tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('support-tickets')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: activeTab === 'support-tickets' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'support-tickets' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              borderBottom: activeTab === 'support-tickets' ? '3px solid var(--primary-color)' : '3px solid transparent'
            }}
          >
            Support Tickets ({stats?.supportTickets?.total || 0})
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {loadingData && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading...</p>
            </div>
          )}

          {!loadingData && activeTab === 'overview' && stats && (
            <div>
              <h3 style={{ marginBottom: '1.5rem' }}>📊 Statistics Overview</h3>

              {/* Ratings Stats */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                <h4>⭐ App Ratings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <strong>Total Ratings:</strong> {stats.ratings.total}
                  </div>
                  <div>
                    <strong>Average Rating:</strong> {stats.ratings.average.toFixed(1)} / 5.0
                  </div>
                  <div>
                    <strong>Rating Distribution:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span>{rating}★:</span>
                          <span>{stats.ratings.distribution[rating] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Requests Stats */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                <h4>💡 Feature Requests</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <strong>Total Requests:</strong> {stats.featureRequests.total}
                  </div>
                  <div>
                    <strong>By Status:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {Object.entries(stats.featureRequests.byStatus).map(([status, count]) => (
                        <div key={status} style={{ marginBottom: '0.25rem' }}>
                          {status}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Tickets Stats */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                <h4>🎫 Support Tickets</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <strong>Total Tickets:</strong> {stats.supportTickets.total}
                  </div>
                  <div>
                    <strong>By Status:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {Object.entries(stats.supportTickets.byStatus).map(([status, count]) => (
                        <div key={status} style={{ marginBottom: '0.25rem' }}>
                          <span style={{ color: getStatusColor(status) }}>{status}:</span> {count}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>By Priority:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {Object.entries(stats.supportTickets.byPriority).map(([priority, count]) => (
                        <div key={priority} style={{ marginBottom: '0.25rem' }}>
                          <span style={{ color: getPriorityColor(priority) }}>{priority}:</span> {count}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loadingData && activeTab === 'ratings' && (
            <div>
              <h3 style={{ marginBottom: '1.5rem' }}>⭐ All Ratings</h3>
              {ratings.length === 0 ? (
                <p>No ratings yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ratings.map(rating => (
                    <div key={rating.id} style={{ padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <strong>{'★'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}</strong>
                          <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                            {formatDate(rating.createdAt)}
                          </span>
                        </div>
                      </div>
                      {rating.comment && (
                        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{rating.comment}</p>
                      )}
                      <small style={{ color: 'var(--text-secondary)' }}>
                        User ID: {rating.userId} | Platform: {rating.platform}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loadingData && activeTab === 'feature-requests' && (
            <div>
              <h3 style={{ marginBottom: '1.5rem' }}>💡 All Feature Requests</h3>
              {featureRequests.length === 0 ? (
                <p>No feature requests yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {featureRequests.map(request => (
                    <div key={request.id} style={{ padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>{request.title}</h4>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          background: getStatusColor(request.status),
                          color: 'white',
                          fontSize: '0.875rem'
                        }}>
                          {request.status}
                        </span>
                      </div>
                      <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{request.description}</p>
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <span>Category: {request.category}</span>
                        <span>Votes: {request.votes || 0}</span>
                        <span>Submitted: {formatDate(request.createdAt)}</span>
                      </div>
                      <small style={{ color: 'var(--text-secondary)' }}>User ID: {request.userId}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loadingData && activeTab === 'support-tickets' && (
            <div>
              <h3 style={{ marginBottom: '1.5rem' }}>🎫 All Support Tickets</h3>
              {supportTickets.length === 0 ? (
                <p>No support tickets yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {supportTickets.map(ticket => (
                    <div key={ticket.id} style={{ padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>{ticket.subject}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            background: getStatusColor(ticket.status),
                            color: 'white',
                            fontSize: '0.875rem'
                          }}>
                            {ticket.status}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            background: getPriorityColor(ticket.priority),
                            color: 'white',
                            fontSize: '0.875rem'
                          }}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{ticket.description}</p>
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <span>Category: {ticket.category}</span>
                        <span>Submitted: {formatDate(ticket.createdAt)}</span>
                        {ticket.resolvedAt && (
                          <span>Resolved: {formatDate(ticket.resolvedAt)}</span>
                        )}
                      </div>
                      <small style={{ color: 'var(--text-secondary)' }}>User ID: {ticket.userId}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

