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
import ParentDashboard from './components/ParentDashboard';
import ParentApprovalModal from './components/ParentApprovalModal';
import LinkChildModal from './components/LinkChildModal';
import ContactRequestModal from './components/ContactRequestModal';
import RatingModal from './components/RatingModal';
import FeatureRequestModal from './components/FeatureRequestModal';
import SupportTicketModal from './components/SupportTicketModal';
import AdminDashboard from './components/AdminDashboard';
import ForwardModal from './components/ForwardModal';
import NotificationToast from './components/NotificationToast';
import { useAuth } from './hooks/useAuth';
import { useUI } from './hooks/useUI';
import { useChat } from './hooks/useChat';
import { usePresenceStatus, useNotifications } from './hooks/useRealtime';

function AppContent() {
  const { user, loading } = useAuth();
  const {
    showLoginModal,
    showSignUpModal,
    showSettingsModal,
    showNewChatModal,
    showCallModal,
    showBlockUserModal,
    showStatusModal,
    showGroupChatModal,
    showMediaGallery,
    closeMediaGallery,
    showPrivacyModal,
    showTermsModal,
    showSupportModal,
    showParentDashboard,
    showParentApprovalModal,
    showLinkChildModal,
    openLinkChildModal,
    showContactRequestModal,
    openContactRequestModal,
    showRatingModal,
    showFeatureRequestModal,
    showSupportTicketModal,
    showAdminDashboard,
    forwardConfig,
    closeForwardModal,
    callModalType,
    callSession,
    isIncomingCall,
    blockUserId,
    blockUserName,
    showNotification
  } = useUI();
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

  // Listen for service worker version messages to ensure latest build is displayed
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {return;}
    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
    const handleServiceWorkerMessage = (event) => {
      const data = event?.data || {};
      if (data.type === 'SW_VERSION') {
        const swVersion = data.version || '';
        if (swVersion && swVersion !== appVersion && !window.__SW_FORCE_RELOAD__) {
          console.log('New service worker version detected. Reloading...', swVersion, appVersion);
          window.__SW_FORCE_RELOAD__ = true;
          window.location.reload();
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, []);

  // Initialize real-time features
  usePresenceStatus();
  useNotifications();

  // Check for pending contact requests on login
  useEffect(() => {
    if (!user || loading) return;

    let hasChecked = false;
    const checkPendingRequests = async () => {
      if (hasChecked) return;
      hasChecked = true;
      
      try {
        const { contactService } = await import('./services/contactService');
        const pendingRequests = await contactService.getPendingRequests(user.uid, { userEmail: user.email });
        
        if (pendingRequests && pendingRequests.length > 0) {
          // Show notification about pending requests
          const count = pendingRequests.length;
          const message = count === 1 
            ? `You have 1 pending contact request. Click to view.`
            : `You have ${count} pending contact requests. Click to view.`;
          
          showNotification(message, 'info', {
            duration: 10000,
            onClick: () => {
              openContactRequestModal();
            }
          });
        }
      } catch (error) {
        console.error('Error checking pending contact requests:', error);
      }
    };

    // Check after a short delay to ensure user is fully loaded
    const timeout = setTimeout(checkPendingRequests, 2000);
    return () => clearTimeout(timeout);
  }, [user, loading, showNotification, openContactRequestModal]);

  // Listen for contact request modal events
  useEffect(() => {
    const handleOpenContactRequest = () => {
      openContactRequestModal();
    };
    window.addEventListener('openContactRequestModal', handleOpenContactRequest);
    return () => window.removeEventListener('openContactRequestModal', handleOpenContactRequest);
  }, [openContactRequestModal]);

  // Check if parent should see link child flow
  useEffect(() => {
    if (loading || !user) {
      return;
    }

    // Check if parent account and should show link child flow
    const shouldShowLinkChild = sessionStorage.getItem('showLinkChildFlow');
    if (shouldShowLinkChild === 'true' && user.accountType === 'parent') {
      sessionStorage.removeItem('showLinkChildFlow');
      // Small delay to ensure UI is ready
      setTimeout(() => {
        openLinkChildModal();
      }, 1000);
    }
  }, [user, loading, openLinkChildModal]);

  // Handle Stripe checkout redirects
  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const checkoutStatus = urlParams.get('checkout_status');

    // Handle subscription success - Stripe redirects with session_id
    if (sessionId && checkoutStatus === 'success') {
      showNotification('✅ Payment method saved! Your 7-day free trial has started. You will be charged $30 at the end of the trial.', 'success');

      // Clean URL
      window.history.replaceState({}, '', '/');

      // Trigger subscription reload in SettingsModal
      setTimeout(() => {
        const event = new CustomEvent('checkoutSuccess', { detail: { tab: 'subscription' } });
        window.dispatchEvent(event);
      }, 1000);
      return;
    }

    // Handle subscription cancel
    if (checkoutStatus === 'cancel') {
      showNotification('Checkout was cancelled. You can set up your subscription later in Settings.', 'info');

      // Clean URL
      window.history.replaceState({}, '', '/');
      return;
    }

    // Handle portal return (after updating payment method)
    const portalReturn = urlParams.get('portal_return');
    if (portalReturn === 'success') {
      showNotification('Payment method updated successfully! Your subscription will be reactivated.', 'success');

      // Clean URL
      window.history.replaceState({}, '', '/');

      // Trigger subscription reload
      setTimeout(() => {
        const event = new CustomEvent('checkoutSuccess', { detail: { tab: 'subscription' } });
        window.dispatchEvent(event);
      }, 1000);
      return;
    }
  }, [user, loading, showNotification]);

  // Initialize app
  useEffect(() => {
    let mounted = true;
    
    // Set initialization timeout - don't wait forever
    const initTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Initialization timeout - showing app anyway');
        setIsInitialized(true);
      }
    }, 2000); // Max 2 seconds for initialization

    const initializeApp = async () => {
      try {
        console.log('Initializing EchoDynamo...');

        // Set initialized immediately - don't block on service worker
        setIsInitialized(true);
        console.log('EchoDynamo initialized successfully');

        // Initialize service worker in background (non-blocking)
        const initServiceWorker = async () => {
          try {
            const isDev = import.meta.env.DEV;
            if (!isDev && 'serviceWorker' in navigator) {
              try {
                // Unregister ALL existing service workers (non-blocking)
                const registrations = await Promise.race([
                  navigator.serviceWorker.getRegistrations(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
                ]).catch(() => []); // Return empty array on timeout

                for (let registration of registrations) {
                  try {
                    console.log('Unregistering old service worker:', registration.scope);
                    await Promise.race([
                      registration.unregister(),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
                    ]).catch(err => console.log('Service worker unregister timeout:', err.message));
                  } catch (err) {
                    console.log('Error unregistering service worker:', err.message);
                  }
                }

                // Only register in production
                if (import.meta.env.PROD) {
                  // Wait a bit to ensure old service worker is fully unregistered
                  await new Promise(resolve => setTimeout(resolve, 300));

                  try {
                    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
                    const swUrl = `/sw.js?v=${encodeURIComponent(appVersion)}`;
                    const registration = await Promise.race([
                      navigator.serviceWorker.register(swUrl, {
                        updateViaCache: 'none'
                      }),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                    ]);

                    console.log('Service Worker registered:', registration);

                    // Listen for updates but don't force immediate reload
                    registration.addEventListener('updatefound', () => {
                      console.log('Service Worker update found, waiting for install...');
                      const newWorker = registration.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New service worker installed. Page reload required for update.');
                          }
                        });
                      }
                    });

                    // Check for updates periodically but don't force reload
                    setInterval(() => {
                      registration.update().catch(err => {
                        // Silently fail - don't log errors
                      });
                    }, 60000); // Check every minute
                  } catch (err) {
                    console.log('Service Worker registration timeout or error:', err.message);
                  }
                }
              } catch (error) {
                console.log('Service Worker initialization error (non-critical):', error.message);
              }
            } else if (isDev && 'serviceWorker' in navigator) {
              // Unregister service workers in development (non-blocking)
              try {
                const registrations = await Promise.race([
                  navigator.serviceWorker.getRegistrations(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
                ]).catch(() => []);

                for (let registration of registrations) {
                  try {
                    await Promise.race([
                      registration.unregister(),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
                    ]).catch(() => {});
                    console.log('Service Worker unregistered for development');
                  } catch (err) {
                    // Silently fail
                  }
                }
              } catch (error) {
                // Silently fail
              }
            }
          } catch (error) {
            // Silently fail - service worker is not critical
            console.log('Service Worker setup failed (non-critical)');
          }
        };

        // Initialize service worker in background - don't wait
        initServiceWorker();
      } catch (error) {
        console.error('Error initializing EchoDynamo:', error);
        setIsInitialized(true); // Still show the app even if initialization fails
      } finally {
        clearTimeout(initTimeout);
      }
    };

    initializeApp();

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
    };
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
      {showCallModal && (
        <CallModal
          callType={callModalType}
          callSession={callSession}
          isIncoming={isIncomingCall}
        />
      )}
      {showBlockUserModal && <BlockUserModal userId={blockUserId} userName={blockUserName} />}
      {showStatusModal && <StatusModal />}
      {showGroupChatModal && <GroupChatModal />}
      {showMediaGallery && <MediaGallery messages={messages} onClose={closeMediaGallery} />}
      {showPrivacyModal && <PrivacyPolicyModal />}
      {showTermsModal && <TermsOfServiceModal />}
      {showSupportModal && <SupportModal />}
      {showParentDashboard && <ParentDashboard />}
      {showParentApprovalModal && <ParentApprovalModal />}
      {showLinkChildModal && <LinkChildModal />}
      {showContactRequestModal && <ContactRequestModal />}
      {showRatingModal && <RatingModal />}
      {showFeatureRequestModal && <FeatureRequestModal />}
      {showSupportTicketModal && <SupportTicketModal />}
      {showAdminDashboard && <AdminDashboard />}
        {forwardConfig && (
          <ForwardModal
            config={forwardConfig}
            onClose={closeForwardModal}
          />
        )}

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
