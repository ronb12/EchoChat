// Admin Service - Handles admin account verification and admin-only operations

import { db } from './firebaseConfig';
import { doc, getDoc, collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';

class AdminService {
  // Admin email addresses (can be moved to Firestore config later)
  ADMIN_EMAILS = [
    'ronellbradley@bradleyvs.com'
  ];

  /**
   * Check if a user is an admin
   * @param {string} userId - User's ID
   * @param {string} email - User's email
   * @returns {Promise<boolean>}
   */
  async isAdmin(userId, email) {
    try {
      // Check by email first (quick check)
      if (email && this.ADMIN_EMAILS.includes(email.toLowerCase())) {
        return true;
      }

      // Also check Firestore for admin status (for future expansion)
      if (userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists() && userDoc.data().isAdmin === true) {
            return true;
          }
        } catch (error) {
          console.error('Error checking admin status in Firestore:', error);
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get all ratings (admin only)
   * @param {number} limitCount - Maximum number to return
   * @returns {Promise<Array>}
   */
  async getAllRatings(limitCount = 100) {
    try {
      const q = query(
        collection(db, 'ratings'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all ratings:', error);
      return [];
    }
  }

  /**
   * Get all feature requests (admin only)
   * @param {string} status - Filter by status (optional)
   * @param {number} limitCount - Maximum number to return
   * @returns {Promise<Array>}
   */
  async getAllFeatureRequests(status = null, limitCount = 100) {
    try {
      let q;
      if (status) {
        q = query(
          collection(db, 'featureRequests'),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, 'featureRequests'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all feature requests:', error);
      return [];
    }
  }

  /**
   * Get all support tickets (admin only)
   * @param {string} status - Filter by status (optional)
   * @param {string} priority - Filter by priority (optional)
   * @param {number} limitCount - Maximum number to return
   * @returns {Promise<Array>}
   */
  async getAllSupportTickets(status = null, priority = null, limitCount = 100) {
    try {
      let q;
      const constraints = [];

      if (status) {
        constraints.push(where('status', '==', status));
      }
      if (priority) {
        constraints.push(where('priority', '==', priority));
      }

      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(limitCount));

      q = query(collection(db, 'supportTickets'), ...constraints);

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all support tickets:', error);
      return [];
    }
  }

  /**
   * Get statistics for admin dashboard
   * @returns {Promise<Object>}
   */
  async getAdminStats() {
    try {
      const [ratings, featureRequests, supportTickets] = await Promise.all([
        this.getAllRatings(1000),
        this.getAllFeatureRequests(null, 1000),
        this.getAllSupportTickets(null, null, 1000)
      ]);

      // Calculate average rating
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
        : 0;

      // Count by status
      const featureRequestsByStatus = featureRequests.reduce((acc, fr) => {
        acc[fr.status || 'pending'] = (acc[fr.status || 'pending'] || 0) + 1;
        return acc;
      }, {});

      const ticketsByStatus = supportTickets.reduce((acc, ticket) => {
        acc[ticket.status || 'open'] = (acc[ticket.status || 'open'] || 0) + 1;
        return acc;
      }, {});

      const ticketsByPriority = supportTickets.reduce((acc, ticket) => {
        acc[ticket.priority || 'medium'] = (acc[ticket.priority || 'medium'] || 0) + 1;
        return acc;
      }, {});

      return {
        ratings: {
          total: ratings.length,
          average: Math.round(avgRating * 10) / 10,
          distribution: ratings.reduce((acc, r) => {
            acc[r.rating] = (acc[r.rating] || 0) + 1;
            return acc;
          }, {})
        },
        featureRequests: {
          total: featureRequests.length,
          byStatus: featureRequestsByStatus
        },
        supportTickets: {
          total: supportTickets.length,
          byStatus: ticketsByStatus,
          byPriority: ticketsByPriority
        }
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return {
        ratings: { total: 0, average: 0, distribution: {} },
        featureRequests: { total: 0, byStatus: {} },
        supportTickets: { total: 0, byStatus: {}, byPriority: {} }
      };
    }
  }
}

export const adminService = new AdminService();

