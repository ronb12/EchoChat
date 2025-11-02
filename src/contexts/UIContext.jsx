import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const UIContext = createContext();

export { UIContext };

export function UIProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
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
  const openSettingsModal = () => setShowSettingsModal(true);
  const closeSettingsModal = () => setShowSettingsModal(false);
  const openNewChatModal = () => setShowNewChatModal(true);
  const closeNewChatModal = () => setShowNewChatModal(false);

  const value = {
    theme,
    isSidebarOpen,
    showLoginModal,
    showSettingsModal,
    showNewChatModal,
    notifications,
    toggleTheme,
    toggleSidebar,
    showNotification,
    removeNotification,
    openLoginModal,
    closeLoginModal,
    openSettingsModal,
    closeSettingsModal,
    openNewChatModal,
    closeNewChatModal
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
