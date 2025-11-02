// Firebase Configuration for EchoChat
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCMD8eNs3RoPQBQSbIFRbVA2kpCWuhDwvY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'echochat-messaging.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'echochat-messaging',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'echochat-messaging.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '422897650093',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:422897650093:web:23d81b1ddad8ed4b8e3924'
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging, onMessage } from 'firebase/messaging';

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Skip emulator connection for now to avoid initialization issues
// Connect to emulators in development (only if available)
if (location.hostname === 'localhost' && false) { // Disabled for now
  // Check if emulators are available before connecting
  const checkEmulator = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Only connect to emulators if they're running
  Promise.all([
    checkEmulator('http://localhost:9099'),
    checkEmulator('http://localhost:8080'),
    checkEmulator('http://localhost:9199')
  ]).then(([authAvailable, firestoreAvailable, storageAvailable]) => {
    try {
      if (authAvailable) {
        connectAuthEmulator(auth, 'http://localhost:9099');
        console.log('Connected to Auth emulator');
      }
      if (firestoreAvailable) {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('Connected to Firestore emulator');
      }
      if (storageAvailable) {
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log('Connected to Storage emulator');
      }
      if (!authAvailable && !firestoreAvailable && !storageAvailable) {
        console.log('No emulators available, using production Firebase services');
      }
    } catch (error) {
      console.log('Emulators already connected or connection failed:', error.message);
    }
  }).catch(() => {
    console.log('Using production Firebase services');
  });
} else {
  console.log('Using production Firebase services');
}

// Firebase messaging setup
export const setupMessaging = async() => {
  try {
    // Check if messaging is supported
    if (!messaging) {
      console.log('Firebase Messaging not available');
      return;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');

      // For now, skip VAPID key setup to avoid errors
      // In production, you would need to generate a VAPID key
      console.log('Messaging setup completed (VAPID key not configured)');
    } else {
      console.log('Notification permission denied');
    }
  } catch (error) {
    console.error('Error setting up messaging:', error);
  }
};

// Handle incoming messages
onMessage(messaging, (payload) => {
  console.log('Message received:', payload);

  // Show notification
  if (payload.notification) {
    const notification = new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'echochat-message',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
});

export default app;
