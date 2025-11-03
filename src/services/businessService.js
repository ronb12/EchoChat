// Business Service for Small Business Communication
import { db } from './firebaseConfig';
import { collection, doc, addDoc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';

class BusinessService {
  constructor() {
    this.db = db;
  }

  // Create business profile
  async createBusinessProfile(userId, businessData) {
    try {
      const businessRef = doc(this.db, 'businesses', userId);
      const business = {
        ...businessData,
        ownerId: userId,
        createdAt: new Date(),
        verified: false,
        businessHours: businessData.businessHours || {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '09:00', close: '17:00', closed: false }
        },
        status: 'open', // open, closed, away
        autoReply: businessData.autoReply || null,
        quickReplies: businessData.quickReplies || []
      };
      
      await setDoc(businessRef, business);
      return business;
    } catch (error) {
      console.error('Error creating business profile:', error);
      throw error;
    }
  }

  // Get business profile
  async getBusinessProfile(businessId) {
    try {
      const businessRef = doc(this.db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);
      
      if (businessDoc.exists()) {
        return { id: businessDoc.id, ...businessDoc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting business profile:', error);
      throw error;
    }
  }

  // Update business status
  async updateBusinessStatus(businessId, status) {
    try {
      const businessRef = doc(this.db, 'businesses', businessId);
      await setDoc(businessRef, { 
        status,
        statusUpdatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating business status:', error);
      throw error;
    }
  }

  // Add quick reply template
  async addQuickReply(businessId, reply) {
    try {
      const businessRef = doc(this.db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);
      const quickReplies = businessDoc.exists() 
        ? businessDoc.data().quickReplies || []
        : [];
      
      quickReplies.push({
        id: Date.now().toString(),
        text: reply.text,
        shortcut: reply.shortcut,
        createdAt: new Date()
      });
      
      await setDoc(businessRef, { quickReplies }, { merge: true });
    } catch (error) {
      console.error('Error adding quick reply:', error);
      throw error;
    }
  }

  // Set auto-reply message
  async setAutoReply(businessId, autoReply) {
    try {
      const businessRef = doc(this.db, 'businesses', businessId);
      await setDoc(businessRef, { autoReply }, { merge: true });
    } catch (error) {
      console.error('Error setting auto-reply:', error);
      throw error;
    }
  }

  // Check if business is open
  isBusinessOpen(businessHours, currentDay = new Date().getDay()) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = days[currentDay];
    const hours = businessHours[day];
    
    if (!hours || hours.closed) {
      return false;
    }
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= hours.open && currentTime <= hours.close;
  }

  // Get customer chat analytics
  async getChatAnalytics(businessId, startDate, endDate) {
    try {
      // In production, query Firestore for analytics
      return {
        totalMessages: 0,
        totalCustomers: 0,
        averageResponseTime: 0,
        customerSatisfaction: 0
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }
}

export const businessService = new BusinessService();
export default businessService;

