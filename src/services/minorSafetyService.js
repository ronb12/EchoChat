// Minor Safety Service - COPPA Compliance & Parental Controls
// Ensures minors can only chat with parent-approved contacts

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { contactService } from './contactService';

class MinorSafetyService {
  /**
   * Check if user is a minor (under 18)
   * @param {string} userId - User's ID
   * @returns {Promise<boolean>}
   */
  async isMinor(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return false;
      }

      const userData = userSnap.data();

      // Check if account is marked as minor
      if (userData.isMinor === true) {
        return true;
      }

      // Check age from date of birth
      if (userData.dateOfBirth) {
        const birthDate = new Date(userData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          return age - 1 < 18;
        }

        return age < 18;
      }

      return false;
    } catch (error) {
      console.error('Error checking if minor:', error);
      return false;
    }
  }

  /**
   * Get parent/guardian information for a minor
   * @param {string} minorUserId - Minor's user ID
   * @returns {Promise<Object|null>}
   */
  async getParentInfo(minorUserId) {
    try {
      const userRef = doc(db, 'users', minorUserId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const userData = userSnap.data();

      if (userData.parentEmail || userData.parentId) {
        return {
          parentId: userData.parentId,
          parentEmail: userData.parentEmail,
          parentVerified: userData.parentVerified || false
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting parent info:', error);
      return null;
    }
  }

  /**
   * Request parent approval for a contact
   * @param {string} minorUserId - Minor's user ID
   * @param {string} contactUserId - Contact to request approval for
   * @returns {Promise<{success: boolean, requiresApproval: boolean}>}
   */
  async requestContactApproval(minorUserId, contactUserId) {
    try {
      const isMinor = await this.isMinor(minorUserId);

      if (!isMinor) {
        // Not a minor, no parent approval needed
        return { success: true, requiresApproval: false };
      }

      const parentInfo = await this.getParentInfo(minorUserId);

      if (!parentInfo || !parentInfo.parentVerified) {
        throw new Error('Parent verification required for minors');
      }

      // Check if contact is already parent-approved
      const approvalRef = doc(db, 'parentApprovals', `${minorUserId}_${contactUserId}`);
      const approvalSnap = await getDoc(approvalRef);

      if (approvalSnap.exists()) {
        const approvalData = approvalSnap.data();
        if (approvalData.status === 'approved') {
          return { success: true, requiresApproval: false, alreadyApproved: true };
        }
        if (approvalData.status === 'pending') {
          return { success: false, requiresApproval: true, pending: true };
        }
      }

      // Create parent approval request
      await setDoc(approvalRef, {
        minorUserId,
        contactUserId,
        parentId: parentInfo.parentId,
        status: 'pending',
        requestedAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Send notification to parent (via email or push)
      // This would be handled by a separate notification service

      return { success: true, requiresApproval: true, pending: true };
    } catch (error) {
      console.error('Error requesting contact approval:', error);
      throw error;
    }
  }

  /**
   * Check if contact is parent-approved for minor
   * @param {string} minorUserId - Minor's user ID
   * @param {string} contactUserId - Contact's user ID
   * @returns {Promise<boolean>}
   */
  async isParentApproved(minorUserId, contactUserId) {
    try {
      const isMinor = await this.isMinor(minorUserId);

      if (!isMinor) {
        // Not a minor, no parent approval needed
        return true;
      }

      const approvalRef = doc(db, 'parentApprovals', `${minorUserId}_${contactUserId}`);
      const approvalSnap = await getDoc(approvalRef);

      if (!approvalSnap.exists()) {
        return false;
      }

      const approvalData = approvalSnap.data();
      return approvalData.status === 'approved';
    } catch (error) {
      console.error('Error checking parent approval:', error);
      return false;
    }
  }

  /**
   * Parent approves a contact for their minor
   * @param {string} parentId - Parent's user ID
   * @param {string} approvalId - Approval request ID
   * @returns {Promise<{success: boolean}>}
   */
  async approveContact(parentId, approvalId) {
    try {
      const approvalRef = doc(db, 'parentApprovals', approvalId);
      const approvalSnap = await getDoc(approvalRef);

      if (!approvalSnap.exists()) {
        throw new Error('Approval request not found');
      }

      const approvalData = approvalSnap.data();

      if (approvalData.parentId !== parentId) {
        throw new Error('Not authorized to approve this request');
      }

      // Update approval status
      await updateDoc(approvalRef, {
        status: 'approved',
        approvedAt: Date.now()
      });

      // Add contact for minor (now parent-approved)
      await contactService.addContact(approvalData.minorUserId, approvalData.contactUserId);

      return { success: true };
    } catch (error) {
      console.error('Error approving contact:', error);
      throw error;
    }
  }

  /**
   * Parent rejects a contact for their minor
   * @param {string} parentId - Parent's user ID
   * @param {string} approvalId - Approval request ID
   * @returns {Promise<{success: boolean}>}
   */
  async rejectContact(parentId, approvalId) {
    try {
      const approvalRef = doc(db, 'parentApprovals', approvalId);
      const approvalSnap = await getDoc(approvalRef);

      if (!approvalSnap.exists()) {
        throw new Error('Approval request not found');
      }

      const approvalData = approvalSnap.data();

      if (approvalData.parentId !== parentId) {
        throw new Error('Not authorized to reject this request');
      }

      // Update approval status
      await updateDoc(approvalRef, {
        status: 'rejected',
        rejectedAt: Date.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting contact:', error);
      throw error;
    }
  }

  /**
   * Get pending parent approvals for a parent
   * @param {string} parentId - Parent's user ID
   * @returns {Promise<Array>}
   */
  async getPendingApprovals(parentId) {
    try {
      const approvalsRef = collection(db, 'parentApprovals');
      const q = query(
        approvalsRef,
        where('parentId', '==', parentId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      const approvals = [];
      for (const docSnap of snapshot.docs) {
        const approvalData = docSnap.data();

        // Get contact user details
        const contactDoc = await getDoc(doc(db, 'users', approvalData.contactUserId));
        const minorDoc = await getDoc(doc(db, 'users', approvalData.minorUserId));

        if (contactDoc.exists() && minorDoc.exists()) {
          approvals.push({
            id: docSnap.id,
            ...approvalData,
            contactUser: {
              id: approvalData.contactUserId,
              ...contactDoc.data()
            },
            minorUser: {
              id: approvalData.minorUserId,
              ...minorDoc.data()
            }
          });
        }
      }

      return approvals;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      return [];
    }
  }

  /**
   * Verify parent email and link to minor account
   * @param {string} minorUserId - Minor's user ID
   * @param {string} parentEmail - Parent's email
   * @param {string} verificationCode - Code sent to parent email
   * @returns {Promise<{success: boolean}>}
   */
  async verifyParent(minorUserId, parentEmail, verificationCode) {
    try {
      // In production, verify code from email
      // For now, this is a placeholder
      const userRef = doc(db, 'users', minorUserId);
      await updateDoc(userRef, {
        parentEmail,
        parentVerified: true,
        parentVerifiedAt: Date.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error verifying parent:', error);
      throw error;
    }
  }

  /**
   * Check if user can chat with another user (minor safety check)
   * @param {string} userId1 - First user's ID
   * @param {string} userId2 - Second user's ID
   * @returns {Promise<{canChat: boolean, reason?: string}>}
   */
  async canChat(userId1, userId2) {
    try {
      const [isMinor1, isMinor2] = await Promise.all([
        this.isMinor(userId1),
        this.isMinor(userId2)
      ]);

      // If userId1 is a minor, check parent approval
      if (isMinor1) {
        const isApproved = await this.isParentApproved(userId1, userId2);
        if (!isApproved) {
          return {
            canChat: false,
            reason: 'Parent approval required for this contact'
          };
        }
      }

      // If userId2 is a minor, check parent approval
      if (isMinor2) {
        const isApproved = await this.isParentApproved(userId2, userId1);
        if (!isApproved) {
          return {
            canChat: false,
            reason: 'Contact requires parent approval'
          };
        }
      }

      return { canChat: true };
    } catch (error) {
      console.error('Error checking if users can chat:', error);
      return { canChat: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Get safety settings for a user
   * @param {string} userId - User's ID
   * @returns {Promise<Object>}
   */
  async getSafetySettings(userId) {
    try {
      const isMinor = await this.isMinor(userId);
      const parentInfo = await this.getParentInfo(userId);

      return {
        isMinor,
        requiresParentApproval: isMinor,
        parentVerified: parentInfo?.parentVerified || false,
        contactOnlyMode: true, // Always enabled for minors
        canReceiveMessages: true,
        canSendMessages: true,
        contentFiltering: isMinor, // Enable content filtering for minors
        reportEnabled: true
      };
    } catch (error) {
      console.error('Error getting safety settings:', error);
      return {
        isMinor: false,
        requiresParentApproval: false,
        contactOnlyMode: false,
        canReceiveMessages: true,
        canSendMessages: true,
        contentFiltering: false,
        reportEnabled: true
      };
    }
  }
}

export const minorSafetyService = new MinorSafetyService();
export default minorSafetyService;

