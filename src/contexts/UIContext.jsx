import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const UIContext = createContext();

export { UIContext };

export function UIProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  // On mobile, sidebar should be open by default (showing chat list)
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showBlockUserModal, setShowBlockUserModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [callModalType, setCallModalType] = useState('video');
  const [blockUserId, setBlockUserId] = useState(null);
  const [blockUserName, setBlockUserName] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('echochat-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('echochat-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Close sidebar (useful for mobile when chat is selected)
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Show notification
  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const notification = { id, message, type, duration };

    setNotifications(prev => [...prev, notification]);

    // Auto remove notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Modal controls
  const openLoginModal = () => setShowLoginModal(true);
  const closeLoginModal = () => setShowLoginModal(false);
  const openSignUpModal = () => setShowSignUpModal(true);
  const closeSignUpModal = () => setShowSignUpModal(false);
  const openSettingsModal = () => setShowSettingsModal(true);
  const closeSettingsModal = () => setShowSettingsModal(false);
  const openNewChatModal = () => setShowNewChatModal(true);
  const closeNewChatModal = () => setShowNewChatModal(false);
  const openCallModal = (type = 'video') => {
    setCallModalType(type);
    setShowCallModal(true);
  };
  const closeCallModal = () => {
    setShowCallModal(false);
    setCallModalType('video');
  };
  const openBlockUserModal = (userId, userName) => {
    setBlockUserId(userId);
    setBlockUserName(userName);
    setShowBlockUserModal(true);
  };
  const closeBlockUserModal = () => {
    setShowBlockUserModal(false);
    setBlockUserId(null);
    setBlockUserName(null);
  };
  const openStatusModal = () => setShowStatusModal(true);
  const closeStatusModal = () => setShowStatusModal(false);
  const openGroupChatModal = () => setShowGroupChatModal(true);
  const closeGroupChatModal = () => setShowGroupChatModal(false);
  const openMediaGallery = () => setShowMediaGallery(true);
  const closeMediaGallery = () => setShowMediaGallery(false);
  const openCashoutModal = () => setShowCashoutModal(true);
  const closeCashoutModal = () => setShowCashoutModal(false);
  const openPrivacyModal = () => setShowPrivacyModal(true);
  const closePrivacyModal = () => setShowPrivacyModal(false);
  const openTermsModal = () => setShowTermsModal(true);
  const closeTermsModal = () => setShowTermsModal(false);
  const openSupportModal = () => setShowSupportModal(true);
  const closeSupportModal = () => setShowSupportModal(false);

  const value = {
    theme,
    isSidebarOpen,
    showLoginModal,
    showSignUpModal,
    showSettingsModal,
    showNewChatModal,
    showCallModal,
    showBlockUserModal,
    showStatusModal,
    showGroupChatModal,
    showMediaGallery,
    showCashoutModal,
    showPrivacyModal,
    showTermsModal,
    showSupportModal,
    callModalType,
    blockUserId,
    blockUserName,
    notifications,
    toggleTheme,
    toggleSidebar,
    closeSidebar,
    showNotification,
    removeNotification,
    openLoginModal,
    closeLoginModal,
    openSignUpModal,
    closeSignUpModal,
    openSettingsModal,
    closeSettingsModal,
    openNewChatModal,
    closeNewChatModal,
    openCallModal,
    closeCallModal,
    openBlockUserModal,
    closeBlockUserModal,
    openStatusModal,
    closeStatusModal,
    openGroupChatModal,
    closeGroupChatModal,
    openMediaGallery,
    closeMediaGallery,
    openCashoutModal,
    closeCashoutModal,
    openPrivacyModal,
    closePrivacyModal,
    openTermsModal,
    closeTermsModal,
    openSupportModal,
    closeSupportModal
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

UIProvider.propTypes = {
  children: PropTypes.node
};

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
