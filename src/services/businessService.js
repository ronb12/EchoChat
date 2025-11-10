// Business Service for Small Business Communication
import { db } from './firebaseConfig';
import { collection, doc, addDoc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';

class BusinessService {
  constructor() {
    this.db = db;
    this.localStorageAvailable = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  normalizeQuickReply(reply = {}) {
    return {
      id: reply.id || Date.now().toString(),
      text: reply.text || '',
      shortcut: reply.shortcut || '',
      createdAt: reply.createdAt instanceof Date ? reply.createdAt : (reply.createdAt ? new Date(reply.createdAt) : new Date()),
      usageCount: Number.isFinite(reply.usageCount) ? reply.usageCount : 0,
      lastUsedAt: reply.lastUsedAt ? new Date(reply.lastUsedAt) : null,
      tags: Array.isArray(reply.tags) ? reply.tags : []
    };
  }

  getLocalBusinessData(businessId) {
    if (!this.localStorageAvailable || !businessId) {return null;}
    try {
      const raw = window.localStorage.getItem(`business_${businessId}`);
      if (!raw) {return null;}
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to parse local business cache:', error);
      return null;
    }
  }

  setLocalBusinessData(businessId, data) {
    if (!this.localStorageAvailable || !businessId) {return;}
    try {
      window.localStorage.setItem(`business_${businessId}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to write local business cache:', error);
    }
  }

  syncLocalQuickReplies(businessId, quickReplies) {
    if (!this.localStorageAvailable || !businessId) {return;}
    const cached = this.getLocalBusinessData(businessId) || {};
    cached.quickReplies = quickReplies.map((reply) => ({
      ...reply,
      createdAt: reply.createdAt instanceof Date ? reply.createdAt.toISOString() : reply.createdAt,
      lastUsedAt: reply.lastUsedAt instanceof Date ? reply.lastUsedAt.toISOString() : reply.lastUsedAt
    }));
    this.setLocalBusinessData(businessId, cached);
  }

  async getQuickReplies(businessId) {
    if (!businessId) {return [];}
    try {
      const profile = await this.getBusinessProfile(businessId);
      let quickReplies = profile?.quickReplies || [];
      if (!Array.isArray(quickReplies) || quickReplies.length === 0) {
        const localData = this.getLocalBusinessData(businessId);
        quickReplies = Array.isArray(localData?.quickReplies) ? localData.quickReplies : [];
      }
      return quickReplies.map((reply) => this.normalizeQuickReply(reply))
        .sort((a, b) => {
          const aScore = (Number.isFinite(a.usageCount) ? a.usageCount : 0);
          const bScore = (Number.isFinite(b.usageCount) ? b.usageCount : 0);
          if (bScore !== aScore) {
            return bScore - aScore;
          }
          const aTime = a.lastUsedAt instanceof Date ? a.lastUsedAt.getTime() : 0;
          const bTime = b.lastUsedAt instanceof Date ? b.lastUsedAt.getTime() : 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error('Error getting quick replies:', error);
      return [];
    }
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

      const quickReply = this.normalizeQuickReply({
        id: Date.now().toString(),
        text: reply.text,
        shortcut: reply.shortcut,
        tags: Array.isArray(reply.tags) ? reply.tags : []
      });

      quickReplies.push({
        ...quickReply,
        createdAt: quickReply.createdAt,
        lastUsedAt: quickReply.lastUsedAt
      });

      await setDoc(businessRef, { quickReplies }, { merge: true });
      this.syncLocalQuickReplies(businessId, quickReplies);
    } catch (error) {
      console.error('Error adding quick reply:', error);
      throw error;
    }
  }

  async recordQuickReplyUsage(businessId, replyId) {
    if (!businessId || !replyId) {return;}
    try {
      const businessRef = doc(this.db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);
      const quickReplies = businessDoc.exists()
        ? businessDoc.data().quickReplies || []
        : [];

      const updatedReplies = quickReplies.map((reply) => {
        if ((reply.id || '').toString() !== replyId.toString()) {
          return reply;
        }
        const usageCount = Number.isFinite(reply.usageCount) ? reply.usageCount + 1 : 1;
        const lastUsedAt = new Date();
        return {
          ...reply,
          usageCount,
          lastUsedAt
        };
      });

      await setDoc(businessRef, { quickReplies: updatedReplies }, { merge: true });
      this.syncLocalQuickReplies(businessId, updatedReplies);
    } catch (error) {
      console.error('Error recording quick reply usage:', error);
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
      // Check if this is the test business account
      const isTestBusiness = businessId === 'test-business-1' ||
                            businessId === 'business@echodynamo.com' ||
                            businessId.includes('test-business');

      if (isTestBusiness) {
        // Return sample data for test business account
        return {
          totalMessages: 247,
          totalCustomers: 18,
          averageResponseTime: 4.2, // minutes
          customerSatisfaction: 4.6, // out of 5
          period: {
            start: startDate,
            end: endDate
          },
          breakdown: {
            messagesToday: 23,
            messagesThisWeek: 89,
            messagesThisMonth: 247,
            newCustomers: 3,
            returningCustomers: 15
          },
          responseTime: {
            average: 4.2,
            min: 1.5,
            max: 12.3,
            under5Min: 85, // percentage
            over15Min: 5 // percentage
          },
          satisfaction: {
            average: 4.6,
            excellent: 12, // customers
            good: 5,
            averageRating: 1,
            poor: 0
          }
        };
      }

      // In production, query Firestore for analytics
      // For now, return placeholder data for other accounts
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


