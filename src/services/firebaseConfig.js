// Firebase Configuration for EchoDynamo
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported, onMessage } from 'firebase/messaging';

// Helper to check if value is a placeholder
const isValidConfigValue = (value) => {
  if (!value) {return false;}
  const placeholders = ['your_api_key_here', 'your_project', 'your_project_id', 'your_sender_id', 'your_app_id'];
  return !placeholders.some(placeholder => value.includes(placeholder));
};

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY && isValidConfigValue(import.meta.env.VITE_FIREBASE_API_KEY))
    ? import.meta.env.VITE_FIREBASE_API_KEY
    : 'AIzaSyCMD8eNs3RoPQBQSbIFRbVA2kpCWuhDwvY',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && isValidConfigValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN))
    ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    : 'echochat-messaging.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID && isValidConfigValue(import.meta.env.VITE_FIREBASE_PROJECT_ID))
    ? import.meta.env.VITE_FIREBASE_PROJECT_ID
    : 'echochat-messaging',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET && isValidConfigValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET))
    ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    : 'echochat-messaging.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID && isValidConfigValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID))
    ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    : '422897650093',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID && isValidConfigValue(import.meta.env.VITE_FIREBASE_APP_ID))
    ? import.meta.env.VITE_FIREBASE_APP_ID
    : '1:422897650093:web:23d81b1ddad8ed4b8e3924'
};

// VAPID key for push notifications (replace with your own)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (only in browser context, not in service worker)
let messaging = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
      console.log('Firebase Cloud Messaging initialized');
    } else {
      console.warn('Firebase Cloud Messaging not supported in this browser');
    }
  }).catch((error) => {
    console.warn('Firebase Cloud Messaging initialization error:', error);
  });
}

export { messaging, VAPID_KEY };

export default app;



