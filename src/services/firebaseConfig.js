// Firebase Configuration for EchoChat
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCMD8eNs3RoPQBQSbIFRbVA2kpCWuhDwvY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'echochat-messaging.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'echochat-messaging',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'echochat-messaging.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '422897650093',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:422897650093:web:23d81b1ddad8ed4b8e3924'
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

