// Profile Service for Personal Messaging & User Profiles
// Uses localStorage fallback for dev mode (similar to chatService)
import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

class ProfileService {
  constructor() {
    this.db = db;
    this.profiles = new Map();
    this.loadProfilesFromStorage();
  }

  loadProfilesFromStorage() {
    try {
      const stored = localStorage.getItem('echochat_profiles');
      if (stored) {
        const data = JSON.parse(stored);
        this.profiles = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading profiles from storage:', error);
    }
  }

  saveProfilesToStorage() {
    try {
      const data = Object.fromEntries(this.profiles);
      localStorage.setItem('echochat_profiles', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving profiles to storage:', error);
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      // Try Firestore first (production)
      try {
        const profileRef = doc(this.db, 'profiles', userId);
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
          const profile = { id: profileDoc.id, ...profileDoc.data() };
          // Also save to localStorage for consistency
          this.profiles.set(userId, profile);
          this.saveProfilesToStorage();
          return profile;
        }
      } catch (firebaseError) {
        // If Firestore fails (permissions, etc.), fall back to localStorage
        console.warn('Firestore access failed, using localStorage fallback:', firebaseError.message);
      }

      // Check localStorage (dev/fallback)
      if (this.profiles.has(userId)) {
        return this.profiles.get(userId);
      }

      // Return default profile
      const defaultProfile = {
        id: userId,
        status: 'Hey there! I am using EchoChat',
        statusEmoji: '👋',
        statusExpiresAt: null,
        bio: '',
        avatar: null,
        coverPhoto: null,
        lastSeenPrivacy: 'everyone', // everyone, contacts, nobody
        readReceipts: true,
        profileVisibility: 'everyone',
        phoneNumber: null,
        location: null,
        birthday: null,
        customTheme: null,
        alias: null, // Display alias for privacy
        realName: null // Real name stored separately for account purposes
      };

      // Save default to localStorage
      this.profiles.set(userId, defaultProfile);
      this.saveProfilesToStorage();

      return defaultProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      // Return default profile even on error
      return {
        id: userId,
        status: 'Hey there! I am using EchoChat',
        statusEmoji: '👋',
        statusExpiresAt: null,
        bio: '',
        alias: null,
        realName: null
      };
    }
  }

  // Update user profile
  async updateProfile(userId, profileData) {
    try {
      // Try Firestore first (production)
      try {
        const profileRef = doc(this.db, 'profiles', userId);
        await setDoc(profileRef, {
          ...profileData,
          updatedAt: new Date()
        }, { merge: true });
      } catch (firebaseError) {
        // If Firestore fails, use localStorage fallback
        console.warn('Firestore update failed, using localStorage fallback:', firebaseError.message);
      }

      // Update localStorage (always, for consistency and fallback)
      const currentProfile = this.profiles.get(userId) || {};
      const updatedProfile = {
        ...currentProfile,
        ...profileData,
        id: userId,
        updatedAt: Date.now()
      };
      this.profiles.set(userId, updatedProfile);
      this.saveProfilesToStorage();

      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      // Still try to save to localStorage
      try {
        const currentProfile = this.profiles.get(userId) || {};
        const updatedProfile = { ...currentProfile, ...profileData, id: userId };
        this.profiles.set(userId, updatedProfile);
        this.saveProfilesToStorage();
        return { success: true };
      } catch (localError) {
        throw error;
      }
    }
  }

  // Set status (for personal messaging)
  async setStatus(userId, status, emoji, expiresInHours = null) {
    try {
      const expiresAt = expiresInHours
        ? Date.now() + (expiresInHours * 60 * 60 * 1000)
        : null;

      await this.updateProfile(userId, {
        status,
        statusEmoji: emoji,
        statusExpiresAt: expiresAt
      });
    } catch (error) {
      console.error('Error setting status:', error);
      throw error;
    }
  }

  // Get contacts
  async getContacts(userId) {
    try {
      const contactsRef = doc(this.db, 'contacts', userId);
      const contactsDoc = await getDoc(contactsRef);

      if (contactsDoc.exists()) {
        return contactsDoc.data().contacts || [];
      }

      return [];
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  // Add contact
  async addContact(userId, contactUserId, nickname = null) {
    try {
      const contactsRef = doc(this.db, 'contacts', userId);
      const contactsDoc = await getDoc(contactsRef);
      const contacts = contactsDoc.exists() ? contactsDoc.data().contacts || [] : [];

      if (!contacts.find(c => c.userId === contactUserId)) {
        contacts.push({
          userId: contactUserId,
          nickname,
          addedAt: Date.now(),
          favorite: false
        });

        await setDoc(contactsRef, { contacts }, { merge: true });
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService();
export default profileService;


