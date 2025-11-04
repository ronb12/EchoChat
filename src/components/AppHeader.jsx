import React, { useState, useRef, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { profileService } from '../services/profileService';
// import { getDisplayName } from '../utils/userDisplayName';
const getDisplayName = (user, profile = null) => {
  if (!user) {return 'User';}
  if (profile?.alias) {return profile.alias;}
  if (user.displayName) {return user.displayName;}
  if (user.email) {return user.email.split('@')[0];}
  return 'User';
};

export default function AppHeader() {
  const { toggleSidebar, openSettingsModal, openStatusModal, showNotification } = useUI();
  const { user, signOut } = useAuth();
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const avatarMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      // Check if business account
      const accountType = localStorage.getItem('echochat_account_type') || user.accountType;
      const isBusiness = accountType === 'business' || user.isBusinessAccount === true;
      setIsBusinessAccount(isBusiness);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) {return;}
    try {
      const profile = await profileService.getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      // Error is already handled in profileService with fallback
      // Just set a minimal profile if needed
      setUserProfile({ alias: null, realName: null });
    }
  };

  const displayName = getDisplayName(user, userProfile);

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
          // Clear account type from localStorage
          localStorage.removeItem('echochat_account_type');
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
            <h1>EchoChat</h1>
          </div>
        </div>
        <div className="connection-status">
          <span className="status-dot"></span>
          <span>Online</span>
        </div>
      </div>
      <div className="header-right">
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

