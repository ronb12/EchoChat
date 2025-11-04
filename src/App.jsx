import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { UIProvider } from './contexts/UIContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import LandingPage from './components/LandingPage';
import LoginModal from './components/LoginModal';
import SignUpModal from './components/SignUpModal';
import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SettingsModal from './components/SettingsModal';
import NewChatModal from './components/NewChatModal';
import CallModal from './components/CallModal';
import BlockUserModal from './components/BlockUserModal';
import StatusModal from './components/StatusModal';
import GroupChatModal from './components/GroupChatModal';
import MediaGallery from './components/MediaGallery';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';
import SupportModal from './components/SupportModal';
import NotificationToast from './components/NotificationToast';
import { useAuth } from './hooks/useAuth';
import { useUI } from './hooks/useUI';
import { useChat } from './hooks/useChat';
import { usePresenceStatus, useNotifications } from './hooks/useRealtime';

function AppContent() {
  const { user, loading } = useAuth();
  const { showLoginModal, showSignUpModal, showSettingsModal, showNewChatModal, showCallModal, showBlockUserModal, showStatusModal, showGroupChatModal, showMediaGallery, closeMediaGallery, showPrivacyModal, showTermsModal, showSupportModal, callModalType, blockUserId, blockUserName } = useUI();
  const { messages } = useChat();
  const { currentChatId } = useChat();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
            // Check for old service worker versions and unregister them
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              // If service worker is outdated, unregister it
              if (registration.active) {
                const swVersion = registration.active.scriptURL;
                // Check if it's an old version by looking at the cache
                // This will force a fresh install of the new service worker
                try {
                  await registration.update(); // Force update check
                } catch (e) {
                  // Ignore update errors
                }
              }
            }

            // Only register in production
            if (import.meta.env.PROD) {
              const registration = await navigator.serviceWorker.register('/sw.js', {
                updateViaCache: 'none' // Always fetch fresh service worker
              });
              console.log('Service Worker registered:', registration);
              
              // Force update on every page load in production
              registration.update();
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
        {showSignUpModal && <SignUpModal />}
        {showPrivacyModal && <PrivacyPolicyModal />}
        {showTermsModal && <TermsOfServiceModal />}
        {showSupportModal && <SupportModal />}
        <NotificationToast />
      </div>
    );
  }

  // On mobile, hide header when showing sidebar (no chat selected)
  const showHeader = !isMobile || currentChatId;

  return (
    <div className="app-container">
      {/* Header - hidden on mobile when sidebar is shown */}
      {showHeader && <AppHeader />}

      {/* Main Content */}
      <main className="main-content">
        {/* Sidebar */}
        <Sidebar />

        {/* Chat Area */}
        <ChatArea />
      </main>

      {/* Modals */}
      {showLoginModal && <LoginModal />}
      {showSignUpModal && <SignUpModal />}
      {showSettingsModal && <SettingsModal />}
      {showNewChatModal && <NewChatModal />}
      {showCallModal && <CallModal callType={callModalType} />}
      {showBlockUserModal && <BlockUserModal userId={blockUserId} userName={blockUserName} />}
      {showStatusModal && <StatusModal />}
      {showGroupChatModal && <GroupChatModal />}
      {showMediaGallery && <MediaGallery messages={messages} onClose={closeMediaGallery} />}
      {showPrivacyModal && <PrivacyPolicyModal />}
      {showTermsModal && <TermsOfServiceModal />}
      {showSupportModal && <SupportModal />}

      {/* Notifications */}
      <NotificationToast />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChatProvider>
          <UIProvider>
            <AppContent />
          </UIProvider>
        </ChatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
