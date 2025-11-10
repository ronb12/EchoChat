// Push Notification Service - Firebase Cloud Messaging
import { messaging, VAPID_KEY } from './firebaseConfig';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

class PushNotificationService {
  constructor() {
    this.token = null;
    this.onMessageCallback = null;
  }

  // Request notification permission and get FCM token
  async requestPermission(userId) {
    if (!messaging) {
      console.warn('Firebase Cloud Messaging not available');
      return null;
    }

    try {
      // Request browser notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      // Get FCM registration token
      this.token = await getToken(messaging, {
        vapidKey: VAPID_KEY || undefined
      });

      if (!this.token) {
        console.warn('No registration token available');
        return null;
      }

      console.log('FCM registration token:', this.token);

      // Save token to Firestore for this user
      if (userId) {
        await this.saveTokenToFirestore(userId, this.token);
      }

      // Listen for foreground messages
      this.setupForegroundMessageListener();

      return this.token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Save FCM token to Firestore
  async saveTokenToFirestore(userId, token) {
    try {
      const tokenRef = doc(db, 'fcmTokens', userId);
      await setDoc(tokenRef, {
        token,
        userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  // Setup listener for foreground messages
  setupForegroundMessageListener() {
    if (!messaging) {return;}

    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);

      // Call custom callback if set
      if (this.onMessageCallback) {
        this.onMessageCallback(payload);
      }

      // Show browser notification
      if (payload.notification) {
        this.showNotification(
          payload.notification.title || 'EchoDynamo',
          payload.notification.body || 'You have a new message',
          payload.notification.icon,
          payload.data
        );
      }
    });
  }

  // Show browser notification
  showNotification(title, body, icon, data = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'echochat-message',
        requireInteraction: false,
        data
      });

      notification.onclick = () => {
        window.focus();
        notification.close();

        // Navigate to chat if data contains chatId
        if (data.chatId) {
          window.location.href = `/#/chat/${data.chatId}`;
        }
      };
    }
  }

  // Set callback for foreground messages
  setOnMessageCallback(callback) {
    this.onMessageCallback = callback;
  }

  // Get current FCM token
  getToken() {
    return this.token;
  }

  // Delete token from Firestore
  async deleteToken(userId) {
    try {
      if (userId) {
        const tokenRef = doc(db, 'fcmTokens', userId);
        await setDoc(tokenRef, {
          token: null,
          deletedAt: new Date().toISOString()
        }, { merge: true });
      }
      this.token = null;
      console.log('FCM token deleted');
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }

  // Check if notifications are supported
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && messaging !== null;
  }

  // Check notification permission status
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'not-supported';
    }
    return Notification.permission;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
