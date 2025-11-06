// Feedback Service - Handles ratings, feature requests, and support tickets

import { db } from './firebaseConfig';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

class FeedbackService {
  /**
   * Submit an app rating
   * @param {string} userId - User's ID
   * @param {number} rating - Rating (1-5)
   * @param {string} comment - Optional comment
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitRating(userId, rating, comment = '') {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const ratingData = {
        userId,
        rating,
        comment: comment.trim(),
        createdAt: Date.now(),
        appVersion: '1.0.0', // You can get this from package.json or env
        platform: navigator.platform || 'unknown',
        userAgent: navigator.userAgent || 'unknown'
      };

      await addDoc(collection(db, 'ratings'), ratingData);
      console.log('✅ Rating submitted successfully');

      return { success: true };
    } catch (error) {
      console.error('Error submitting rating:', error);
      return { success: false, error: error.message || 'Failed to submit rating' };
    }
  }

  /**
   * Submit a feature request
   * @param {string} userId - User's ID
   * @param {string} title - Feature request title
   * @param {string} description - Detailed description
   * @param {string} category - Category (e.g., 'messaging', 'security', 'ui')
   * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
   */
  async submitFeatureRequest(userId, title, description, category = 'general') {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!title || !title.trim()) {
        throw new Error('Title is required');
      }

      if (!description || !description.trim()) {
        throw new Error('Description is required');
      }

      const featureRequestData = {
        userId,
        title: title.trim(),
        description: description.trim(),
        category,
        status: 'pending',
        votes: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'featureRequests'), featureRequestData);
      console.log('✅ Feature request submitted:', docRef.id);

      return { success: true, requestId: docRef.id };
    } catch (error) {
      console.error('Error submitting feature request:', error);
      return { success: false, error: error.message || 'Failed to submit feature request' };
    }
  }

  /**
   * Submit a support ticket
   * @param {string} userId - User's ID
   * @param {string} subject - Ticket subject
   * @param {string} description - Issue description
   * @param {string} priority - Priority level (low, medium, high, urgent)
   * @param {string} category - Category (bug, account, payment, other)
   * @param {Array<string>} attachments - Optional attachment URLs
   * @returns {Promise<{success: boolean, ticketId?: string, error?: string}>}
   */
  async submitSupportTicket(userId, subject, description, priority = 'medium', category = 'other', attachments = []) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!subject || !subject.trim()) {
        throw new Error('Subject is required');
      }

      if (!description || !description.trim()) {
        throw new Error('Description is required');
      }

      const ticketData = {
        userId,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
        status: 'open',
        attachments,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        resolvedAt: null
      };

      const docRef = await addDoc(collection(db, 'supportTickets'), ticketData);
      console.log('✅ Support ticket submitted:', docRef.id);

      return { success: true, ticketId: docRef.id };
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      return { success: false, error: error.message || 'Failed to submit support ticket' };
    }
  }

  /**
   * Get user's submitted feature requests
   * @param {string} userId - User's ID
   * @param {number} limitCount - Maximum number to return
   * @returns {Promise<Array>}
   */
  async getUserFeatureRequests(userId, limitCount = 10) {
    try {
      const q = query(
        collection(db, 'featureRequests'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user feature requests:', error);
      return [];
    }
  }

  /**
   * Get user's support tickets
   * @param {string} userId - User's ID
   * @param {number} limitCount - Maximum number to return
   * @returns {Promise<Array>}
   */
  async getUserSupportTickets(userId, limitCount = 10) {
    try {
      const q = query(
        collection(db, 'supportTickets'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user support tickets:', error);
      return [];
    }
  }
}

export const feedbackService = new FeedbackService();

