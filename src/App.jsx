import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { UIProvider } from './contexts/UIContext';
import LoadingScreen from './components/LoadingScreen';
import LandingPage from './components/LandingPage';
import LoginModal from './components/LoginModal';
import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SettingsModal from './components/SettingsModal';
import NewChatModal from './components/NewChatModal';
import NotificationToast from './components/NotificationToast';
import { useAuth } from './hooks/useAuth';
import { useUI } from './hooks/useUI';
import { usePresenceStatus, useNotifications } from './hooks/useRealtime';

function AppContent() {
  const { user, loading } = useAuth();
  const { showLoginModal, showSettingsModal, showNewChatModal } = useUI();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize real-time features
  usePresenceStatus();
  useNotifications();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing EchoChat...');

        // Initialize service worker only in production
        const isDev = import.meta.env.DEV;
        if (!isDev && 'serviceWorker' in navigator) {
          try {
            // Unregister any existing service workers in development
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
            
            // Only register in production
            if (import.meta.env.PROD) {
              const registration = await navigator.serviceWorker.register('/sw.js');
              console.log('Service Worker registered:', registration);
            }
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        } else if (isDev && 'serviceWorker' in navigator) {
          // Unregister service workers in development
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
              console.log('Service Worker unregistered for development');
            }
          } catch (error) {
            console.error('Service Worker unregistration failed:', error);
          }
        }

        setIsInitialized(true);
        console.log('EchoChat initialized successfully');
      } catch (error) {
        console.error('Error initializing EchoChat:', error);
        setIsInitialized(true); // Still show the app even if initialization fails
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized || loading) {
    return <LoadingScreen />;
  }

  // Show landing page if user is not authenticated
  if (!user) {
    return (
      <div className="app-container">
        <LandingPage />
        {showLoginModal && <LoginModal />}
        <NotificationToast />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <AppHeader />

      {/* Main Content */}
      <main className="main-content">
        {/* Sidebar */}
        <Sidebar />

        {/* Chat Area */}
        <ChatArea />
      </main>

      {/* Modals */}
      {showLoginModal && <LoginModal />}
      {showSettingsModal && <SettingsModal />}
      {showNewChatModal && <NewChatModal />}

      {/* Notifications */}
      <NotificationToast />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <UIProvider>
          <AppContent />
        </UIProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
