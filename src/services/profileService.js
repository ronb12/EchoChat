// Profile Service for Personal Messaging & User Profiles
import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

class ProfileService {
  constructor() {
    this.db = db;
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const profileRef = doc(this.db, 'profiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        return { id: profileDoc.id, ...profileDoc.data() };
      }
      
      // Return default profile
      return {
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
        customTheme: null
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, profileData) {
    try {
      const profileRef = doc(this.db, 'profiles', userId);
      await setDoc(profileRef, {
        ...profileData,
        updatedAt: new Date()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
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

