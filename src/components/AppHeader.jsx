import React, { useState, useRef, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { profileService } from '../services/profileService';
import { useDisplayName } from '../hooks/useDisplayName';
import { getStripeMode } from '../utils/stripeMode';
// import { getDisplayName } from '../utils/userDisplayName';
function useAlias(user) {
  const displayName = useDisplayName(user?.uid, user?.email || 'User');
  return displayName;
}

export default function AppHeader() {
  const { toggleSidebar, openSettingsModal, openStatusModal, openContactRequestModal, openCallHistoryModal, showNotification } = useUI();
  const { user, signOut, setUser } = useAuth();
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [stripeMode, setStripeMode] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [statusInfo, setStatusInfo] = useState({
    text: '',
    emoji: '',
    expiresAt: null,
    updatedAt: null
  });
  const [isStatusHovered, setIsStatusHovered] = useState(false);
  const [isCompactHeader, setIsCompactHeader] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= 720;
  });
  const avatarMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const deriveStatusState = (profile) => {
    if (!profile) {
      return {
        text: '',
        emoji: '',
        expiresAt: null,
        updatedAt: null
      };
    }

    const expiresAt = typeof profile.statusExpiresAt !== 'undefined' && profile.statusExpiresAt !== null
      ? Number(profile.statusExpiresAt)
      : null;
    const isExpired = expiresAt ? Date.now() > expiresAt : false;
    const trimmedStatus = profile.status ? String(profile.status).trim() : '';

    if (!trimmedStatus || isExpired) {
      return {
        text: '',
        emoji: '',
        expiresAt: null,
        updatedAt: profile.updatedAt || null
      };
    }

    return {
      text: trimmedStatus,
      emoji: profile.statusEmoji || '',
      expiresAt,
      updatedAt: profile.updatedAt || null
    };
  };

  useEffect(() => {
    if (user) {
      loadUserProfile();
      // Check if business account
      const accountType = localStorage.getItem('echochat_account_type') || user.accountType;
      const isBusiness = accountType === 'business' || user.isBusinessAccount === true;
      setIsBusinessAccount(isBusiness);
    }
    // Check Stripe mode
    const stripeInfo = getStripeMode();
    setStripeMode(stripeInfo);

    // Debug logging for Stripe mode detection
    if (stripeInfo.mode === 'live') {
      console.log('🔴 LIVE MODE detected - Stripe indicator will show LIVE');
    } else if (stripeInfo.mode === 'test') {
      console.log('🟢 TEST MODE detected - Stripe indicator will show TEST');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Listen for contact request events
  useEffect(() => {
    const handleShowContactRequests = () => {
      // Open contact requests modal
      const event = new CustomEvent('openContactRequestModal');
      window.dispatchEvent(event);
    };

    window.addEventListener('showContactRequests', handleShowContactRequests);
    return () => window.removeEventListener('showContactRequests', handleShowContactRequests);
  }, []);

  // Load and refresh pending requests with real-time listener
  useEffect(() => {
    if (!user) {
      setPendingRequestsCount(0);
      return;
    }

    let unsubscribe = null;
    let isMounted = true;

    const setupListener = async () => {
      try {
        const { contactService } = await import('../services/contactService');

        // Set up real-time listener for immediate updates
        unsubscribe = contactService.subscribeToPendingRequests(
          user.uid,
          (requests) => {
          if (isMounted) {
            const count = requests?.length || 0;
            setPendingRequestsCount(count);
            console.log('📬 Pending contact requests (real-time):', count);
          }
          },
          { userEmail: user.email }
        );
      } catch (error) {
        console.error('Error setting up pending requests listener:', error);
        if (isMounted) {
          setPendingRequestsCount(0);
        }
      }
    };

    setupListener();

    // Cleanup on unmount or user change
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) {return;}
    try {
      const profile = await profileService.getUserProfile(user.uid);
      setStatusInfo(deriveStatusState(profile));
    } catch (error) {
      // ignore; the hook will fall back to defaults
    }
  };

  const displayName = useAlias(user);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleStatusUpdated = (event) => {
      if (!user) {return;}
      const detail = event.detail || {};
      if (detail.userId && detail.userId !== user.uid) {
        return;
      }
      setStatusInfo(deriveStatusState({
        status: detail.status ?? '',
        statusEmoji: detail.statusEmoji ?? detail.emoji ?? '',
        statusExpiresAt: detail.statusExpiresAt ?? detail.expiresAt ?? null,
        updatedAt: detail.updatedAt ?? Date.now()
      }));
    };

    window.addEventListener('profile:status-updated', handleStatusUpdated);
    return () => {
      window.removeEventListener('profile:status-updated', handleStatusUpdated);
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const updateHeaderLayout = () => {
      setIsCompactHeader(window.innerWidth <= 720);
    };
    updateHeaderLayout();
    window.addEventListener('resize', updateHeaderLayout);
    return () => window.removeEventListener('resize', updateHeaderLayout);
  }, []);

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) {return;}

    // Validate file
    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image file', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showNotification('Image size must be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      // Convert image to base64 (in production, upload to Firebase Storage)
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result;

          // Update Firebase Auth profile
          await updateProfile(auth.currentUser, {
            photoURL: base64Image
          });

          showNotification('Profile picture updated successfully!', 'success');
          setShowAvatarMenu(false);

          // Reload to see the new picture
          window.location.reload();
        } catch (error) {
          console.error('Error updating profile:', error);
          showNotification('Failed to update profile picture', 'error');
        } finally {
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.onerror = () => {
        showNotification('Error reading image file', 'error');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showNotification('Failed to upload profile picture', 'error');
      setUploading(false);
    }
  };

  const handleMenuClick = async (action) => {
    setShowAvatarMenu(false);
    if (action === 'settings') {
      openSettingsModal();
    } else if (action === 'status') {
      openStatusModal();
    } else if (action === 'profile') {
      fileInputRef.current?.click();
    } else if (action === 'logout') {
      try {
        const result = await signOut();
        if (result.success) {
          showNotification('Signed out successfully', 'success');
          // Clear account type and demo user from localStorage
          localStorage.removeItem('echochat_account_type');
          localStorage.removeItem('echochat_user');
          // Clear user state
          setUser(null);
        } else {
          showNotification(result.error || 'Failed to sign out', 'error');
        }
      } catch (error) {
        showNotification('Error signing out', 'error');
      }
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          data-testid="menu-toggle"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="app-logo">
          <div className="logo-icon">💬</div>
          <div className="app-title">
            <h1>EchoDynamo</h1>
          </div>
        </div>
        <div className="connection-status">
          <span className="status-dot"></span>
          <span>Online</span>
        </div>
        {/* Stripe Mode Indicator */}
        {stripeMode && stripeMode.mode !== 'not_configured' && (
          <div
            className="stripe-mode-indicator"
            style={{
              marginLeft: '12px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              backgroundColor: stripeMode.mode === 'live' || stripeMode.mode === 'test'
                ? 'rgba(76, 175, 80, 0.9)' // Green for working (both LIVE and TEST)
                : 'rgba(244, 67, 54, 0.9)', // Red for problems (mismatch, unknown, not_configured)
              color: 'white',
              boxShadow: stripeMode.mode === 'live' || stripeMode.mode === 'test'
                ? '0 0 8px rgba(76, 175, 80, 0.6)'
                : '0 0 8px rgba(244, 67, 54, 0.6)',
              animation: stripeMode.mode === 'mismatch' || stripeMode.mode === 'unknown' ? 'pulse 2s infinite' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'help',
              title: stripeMode.message
            }}
          >
            <span style={{ fontSize: '10px' }}>
              {stripeMode.mode === 'live' || stripeMode.mode === 'test' ? '✅' : '⚠️'}
            </span>
            <span>
              {stripeMode.mode === 'live' ? 'LIVE' :
               stripeMode.mode === 'test' ? 'TEST' :
               stripeMode.mode === 'mismatch' ? 'MISMATCH' :
               stripeMode.mode === 'unknown' ? 'UNKNOWN' : 'ERROR'}
            </span>
          </div>
        )}
      </div>
      <div
        className="header-right"
        style={{
          flex: '1 1 auto',
          justifyContent: isCompactHeader ? 'space-between' : 'flex-end',
          alignItems: isCompactHeader ? 'stretch' : 'center',
          gap: isCompactHeader ? '8px' : '12px',
          flexDirection: isCompactHeader ? 'column' : 'row',
          flexWrap: isCompactHeader ? 'wrap' : 'nowrap'
        }}
      >
        {user && (
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: isCompactHeader ? '10px' : '14px',
              padding: isCompactHeader ? '8px 12px' : '10px 16px',
              borderRadius: '18px',
              background: statusInfo.text
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(255, 255, 255, 0.12)',
              border: statusInfo.text
                ? '1px solid rgba(255, 255, 255, 0.25)'
                : '1px dashed rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
              boxShadow: isStatusHovered
                ? '0 12px 28px rgba(0, 60, 136, 0.28)'
                : '0 8px 20px rgba(0, 60, 136, 0.18)',
              transform: isStatusHovered ? 'translateY(-1px)' : 'translateY(0)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              maxWidth: isCompactHeader ? '100%' : 'min(60vw, 320px)',
              width: isCompactHeader ? '100%' : 'auto',
              textAlign: 'left',
              flexShrink: 1,
              minWidth: 0
            }}
            onClick={() => handleMenuClick('status')}
            onMouseEnter={() => setIsStatusHovered(true)}
            onMouseLeave={() => setIsStatusHovered(false)}
            title={
              statusInfo.text
                ? statusInfo.expiresAt
                  ? `Status expires ${new Date(statusInfo.expiresAt).toLocaleString()}`
                  : 'Status is active'
                : 'Click to set a status'
            }
          >
            <div
              aria-hidden="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isCompactHeader ? '1.35rem' : '1.5rem',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                flexShrink: 0
              }}
            >
              {statusInfo.emoji || '💬'}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                overflow: 'hidden',
                flex: '1 1 auto',
                minWidth: 0
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  opacity: statusInfo.text ? 0.85 : 0.75
                }}
              >
                {statusInfo.text ? 'My status' : 'Set a status'}
              </span>
              <span
                style={{
                  fontSize: isCompactHeader ? '13px' : '14px',
                  fontWeight: statusInfo.text ? 600 : 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: statusInfo.text ? 1 : 0.85
                }}
              >
                {statusInfo.text ? statusInfo.text : 'Share what\u2019s on your mind'}
              </span>
            </div>
            <div
              aria-hidden="true"
              style={{
                marginLeft: 'auto',
                fontSize: '0.85rem',
                opacity: isStatusHovered ? 1 : 0.8,
                transition: 'opacity 0.2s ease'
              }}
            >
              ✏️
            </div>
          </button>
        )}
        {user && (
          <button
            className="call-history-button"
            onClick={openCallHistoryModal}
            style={{
              padding: isCompactHeader ? '6px 12px' : '8px 16px',
              background: 'rgba(0, 0, 0, 0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'transform 0.15s ease',
              width: isCompactHeader ? '100%' : 'auto',
              justifyContent: 'center'
            }}
            onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)'; }}
            title="View recent calls"
          >
            <span>📞</span>
            <span>Call History</span>
          </button>
        )}
        {user && (
          <button
            className="contact-requests-button"
            onClick={() => {
              console.log('📬 Opening contact requests modal');
              openContactRequestModal();
            }}
            style={{
              position: 'relative',
              padding: isCompactHeader ? '6px 12px' : '8px 16px',
              marginRight: isCompactHeader ? '0' : '12px',
              flex: isCompactHeader ? '1 1 auto' : '0 0 auto',
              display: 'flex',
              background: 'var(--primary-color, #0084ff)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)',
              width: isCompactHeader ? '100%' : 'auto',
              justifyContent: 'center'
            }}
            title={pendingRequestsCount > 0
              ? `${pendingRequestsCount} pending friend request${pendingRequestsCount > 1 ? 's' : ''}`
              : 'View friend requests'}
          >
            <span>📬</span>
            <span>Friend Requests</span>
            {pendingRequestsCount > 0 && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  minWidth: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '0 6px'
                }}
              >
                {pendingRequestsCount}
              </span>
            )}
          </button>
        )}
        {user && (
          <div className="avatar-menu-container" ref={avatarMenuRef} style={{ position: 'relative' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleProfilePictureChange}
            />
            <div
              className="user-avatar"
              onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              title={displayName || 'User Profile'}
              style={{ cursor: 'pointer', position: 'relative' }}
              data-account-type={isBusinessAccount ? 'business' : 'personal'}
            >
              <img
                src={user.photoURL || `/icons/default-avatar.png`}
                alt={displayName || 'User'}
                onError={(e) => { e.target.src = '/icons/default-avatar.png'; }}
              />
              {isBusinessAccount && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: 'linear-gradient(135deg, #0084ff 0%, #0052cc 100%)',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--background-color)',
                    fontSize: '10px',
                    zIndex: 10
                  }}
                  title="Business Account"
                >
                  🏢
                </div>
              )}
              {uploading && (
                <div className="avatar-upload-overlay">
                  <div className="avatar-upload-spinner"></div>
                </div>
              )}
            </div>
            {showAvatarMenu && (
              <div className="avatar-dropdown-menu">
                <div className="avatar-menu-header">
                  <div className="avatar-menu-avatar">
                    <img
                      src={user.photoURL || `/icons/default-avatar.png`}
                      alt={user.displayName || 'User'}
                      onError={(e) => { e.target.src = '/icons/default-avatar.png'; }}
                    />
                  </div>
                  <div className="avatar-menu-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar-menu-name">{displayName}</div>
                      {isBusinessAccount && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, #0084ff 0%, #0052cc 100%)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}
                        >
                          🏢 Business
                        </span>
                      )}
                    </div>
                    <div className="avatar-menu-email">{user.email}</div>
                  </div>
                </div>
                <div className="avatar-menu-divider"></div>
                <button
                  className="avatar-menu-item"
                  onClick={() => handleMenuClick('profile')}
                  disabled={uploading}
                >
                  <span className="menu-icon">📷</span>
                  <span>Change Profile Picture</span>
                </button>
                <button
                  className="avatar-menu-item"
                  onClick={() => handleMenuClick('status')}
                >
                  <span className="menu-icon">✏️</span>
                  <span>Status</span>
                </button>
                <button
                  className="avatar-menu-item"
                  onClick={() => handleMenuClick('settings')}
                >
                  <span className="menu-icon">⚙️</span>
                  <span>Settings</span>
                </button>
                <div className="avatar-menu-divider"></div>
                <button
                  className="avatar-menu-item"
                  onClick={() => handleMenuClick('logout')}
                  style={{ color: '#f44336' }}
                >
                  <span className="menu-icon">🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

