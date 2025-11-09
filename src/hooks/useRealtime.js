import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useChat } from './useChat';
import { useUI } from './useUI';
import { chatService } from '../services/chatService';

// Hook for real-time message updates
export function useRealtimeMessages(chatId) {
  const { user } = useAuth();
  const { messages, setMessages } = useChat();
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!chatId || !user) {return;}

    // Subscribe to real-time message updates
    const unsubscribe = chatService.subscribeToMessages(chatId, (newMessages) => {
      setMessages(newMessages);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [chatId, user, setMessages]);

  return messages;
}

// Hook for typing indicators
export function useTypingIndicator(chatId) {
  const { user } = useAuth();
  const { typingUsers, setTypingUsers } = useChat();
  const typingTimeoutRef = useRef(null);

  const stopTyping = useCallback(() => {
    if (!chatId || !user) {return;}

    chatService.stopTypingIndicator(chatId, user.uid);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [chatId, user]);

  const startTyping = useCallback(() => {
    if (!chatId || !user) {return;}

    // Send typing indicator to other users
    chatService.sendTypingIndicator(chatId, user.uid, user.displayName || user.email);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [chatId, user, stopTyping]);

  // Subscribe to typing indicators from other users
  useEffect(() => {
    if (!chatId) {return;}

    const unsubscribe = chatService.subscribeToTypingIndicators(chatId, (typingUsers) => {
      setTypingUsers(typingUsers);
    });

    return () => {
      if (unsubscribe) {unsubscribe();}
    };
  }, [chatId, setTypingUsers]);

  return { typingUsers, startTyping, stopTyping };
}

// Hook for presence status
export function usePresenceStatus() {
  const { user } = useAuth();
  const { presenceStatus, setPresenceStatus } = useChat();

  useEffect(() => {
    if (!user) {return;}

    // Set user as online when they connect
    chatService.setUserPresence(user.uid, 'online');

    // Set up presence listeners
    const unsubscribe = chatService.subscribeToPresence((statuses) => {
      setPresenceStatus(statuses);
    });

    // Set user as offline when they disconnect
    const handleBeforeUnload = () => {
      chatService.setUserPresence(user.uid, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (unsubscribe) {unsubscribe();}
      window.removeEventListener('beforeunload', handleBeforeUnload);
      chatService.setUserPresence(user.uid, 'offline');
    };
  }, [user, setPresenceStatus]);

  return presenceStatus;
}

// Hook for real-time chat list updates
export function useRealtimeChats() {
  const { user } = useAuth();
  const { chats, setChats } = useChat();

  useEffect(() => {
    if (!user) {return;}

    if (user.isDemo || user.uid === 'demo-user' || user.email === 'demo@example.com') {
      chatService.seedDemoChats(user);
    }

    const unsubscribe = chatService.subscribeToUserChats(user.uid, (userChats) => {
      // Deduplicate chats by ID to prevent duplicates
      // Merge with existing chats to preserve any additional properties (like avatar from NewChatModal)
      setChats(prevChats => {
        const chatMap = new Map();

        // First, add all existing chats to the map
        prevChats.forEach(chat => {
          chatMap.set(chat.id, chat);
        });

        // Then, update/add chats from the service, preserving existing properties
        userChats.forEach(serviceChat => {
          const existing = chatMap.get(serviceChat.id);
          if (existing) {
            // Merge: keep existing properties like avatar if they exist, but update from service
            chatMap.set(serviceChat.id, {
              ...serviceChat,
              ...existing,
              // Prefer service data for these fields
              name: serviceChat.name || existing.name,
              lastMessageAt: serviceChat.lastMessageAt || existing.lastMessageAt,
              createdAt: serviceChat.createdAt || existing.createdAt
            });
          } else {
            chatMap.set(serviceChat.id, serviceChat);
          }
        });

        // Sort by lastMessageAt (most recent first)
        return Array.from(chatMap.values()).sort((a, b) => {
          const aTime = a.lastMessageAt || a.createdAt || 0;
          const bTime = b.lastMessageAt || b.createdAt || 0;
          return bTime - aTime;
        });
      });
    });

    return () => {
      if (unsubscribe) {unsubscribe();}
    };
  }, [user, setChats]);

  return chats;
}

// Hook for notifications
export function useNotifications() {
  const { user } = useAuth();
  const { showNotification } = useUI();

  useEffect(() => {
    if (!user) {return;}

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to push notifications
    const unsubscribe = chatService.subscribeToNotifications((notification) => {
      showNotification(notification.message, notification.type);

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'EchoChat', {
          body: notification.message,
          icon: '/icons/icon-192x192.png'
        });
      }
    });

    return () => {
      if (unsubscribe) {unsubscribe();}
    };
  }, [user, showNotification]);
}
