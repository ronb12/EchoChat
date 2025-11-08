// Parent Link Service - Link parent accounts to child accounts
// Handles parent-child relationships and account linking

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { minorSafetyService } from './minorSafetyService';

class ParentLinkService {
  /**
   * Link a parent account to a child account using email
   * @param {string} parentId - Parent's user ID
   * @param {string} childEmail - Child's email address
   * @param {string} verificationCode - Code sent to child's email
   * @returns {Promise<{success: boolean, childId?: string}>}
   */
  async linkChildByEmail(parentId, childEmail, verificationCode) {
    try {
      // Find child account by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', childEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Child account not found with this email');
      }

      const childDoc = snapshot.docs[0];
      const childData = childDoc.data();
      const childId = childDoc.id;

      // Verify child is actually a minor
      const isMinor = await minorSafetyService.isMinor(childId);
      if (!isMinor) {
        throw new Error('This account is not a minor account');
      }

      // Check if verification code matches
      // In production, verify code from email/secure storage
      const storedCode = sessionStorage.getItem(`childVerificationCode_${childId}`);
      if (verificationCode !== storedCode) {
        throw new Error('Invalid verification code');
      }

      // Link parent to child
      await updateDoc(doc(db, 'users', childId), {
        parentId,
        parentEmail: null, // Clear parent email since we have parentId now
        parentVerified: true,
        parentVerifiedAt: Date.now()
      });

      // Also update parent's account to track children
      await this.addChildToParent(parentId, childId);

      return { success: true, childId };
    } catch (error) {
      console.error('Error linking child by email:', error);
      throw error;
    }
  }

  /**
   * Link a parent account to a child account using child's user ID (if parent has code)
   * @param {string} parentId - Parent's user ID
   * @param {string} childId - Child's user ID
   * @param {string} verificationCode - Code sent to parent email
   * @returns {Promise<{success: boolean}>}
   */
  async linkChildById(parentId, childId, verificationCode) {
    try {
      // Verify child is actually a minor
      const isMinor = await minorSafetyService.isMinor(childId);
      if (!isMinor) {
        throw new Error('This account is not a minor account');
      }

      // Get child data
      const childDoc = await getDoc(doc(db, 'users', childId));
      if (!childDoc.exists()) {
        throw new Error('Child account not found');
      }

      const childData = childDoc.data();

      // Verify code matches parent email
      // In production, verify code from email
      if (childData.parentEmail) {
        const storedCode = sessionStorage.getItem(`parentVerificationCode_${childData.parentEmail}`);
        if (verificationCode !== storedCode) {
          throw new Error('Invalid verification code');
        }
      }

      // Link parent to child
      await updateDoc(doc(db, 'users', childId), {
        parentId,
        parentVerified: true,
        parentVerifiedAt: Date.now()
      });

      // Update parent's account
      await this.addChildToParent(parentId, childId);

      return { success: true };
    } catch (error) {
      console.error('Error linking child by ID:', error);
      throw error;
    }
  }

  /**
   * Add child to parent's children list
   * @param {string} parentId - Parent's user ID
   * @param {string} childId - Child's user ID
   */
  async addChildToParent(parentId, childId) {
    try {
      const parentRef = doc(db, 'users', parentId);
      const parentSnap = await getDoc(parentRef);

      if (!parentSnap.exists()) {
        throw new Error('Parent account not found');
      }

      const parentData = parentSnap.data();
      const children = parentData.children || [];

      if (!children.includes(childId)) {
        await updateDoc(parentRef, {
          children: [...children, childId],
          isParent: true
        });
      }
    } catch (error) {
      console.error('Error adding child to parent:', error);
      throw error;
    }
  }

  /**
   * Get all children linked to a parent
   * @param {string} parentId - Parent's user ID
   * @returns {Promise<Array>}
   */
  async getChildren(parentId) {
    try {
      const parentRef = doc(db, 'users', parentId);
      const parentSnap = await getDoc(parentRef);

      if (!parentSnap.exists()) {
        return [];
      }

      const parentData = parentSnap.data();
      const childIds = parentData.children || [];

      const children = [];
      for (const childId of childIds) {
        const childDoc = await getDoc(doc(db, 'users', childId));
        if (childDoc.exists()) {
          children.push({
            id: childDoc.id,
            ...childDoc.data()
          });
        }
      }

      return children;
    } catch (error) {
      console.error('Error getting children:', error);
      return [];
    }
  }

  /**
   * Check if user is a parent
   * @param {string} userId - User's ID
   * @returns {Promise<boolean>}
   */
  async isParent(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return false;
      }

      const userData = userSnap.data();
      return userData.isParent === true || (userData.children && userData.children.length > 0);
    } catch (error) {
      console.error('Error checking if parent:', error);
      return false;
    }
  }

  /**
   * Send verification code to child's email for parent linking
   * @param {string} childEmail - Child's email
   * @returns {Promise<{success: boolean, code?: string}>}
   */
  async sendChildVerificationCode(childEmail) {
    try {
      // Find child account
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', childEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Child account not found');
      }

      const childDoc = snapshot.docs[0];
      const childId = childDoc.id;

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code (in production, send via email)
      sessionStorage.setItem(`childVerificationCode_${childId}`, code);

      // In production, send email to child with code
      // For now, return code for testing
      return { success: true, code };
    } catch (error) {
      console.error('Error sending child verification code:', error);
      throw error;
    }
  }

  /**
   * Unlink a child from parent
   * @param {string} parentId - Parent's user ID
   * @param {string} childId - Child's user ID
   * @returns {Promise<{success: boolean}>}
   */
  async unlinkChild(parentId, childId) {
    try {
      // Remove parent from child
      await updateDoc(doc(db, 'users', childId), {
        parentId: null,
        parentVerified: false
      });

      // Remove child from parent
      const parentRef = doc(db, 'users', parentId);
      const parentSnap = await getDoc(parentRef);

      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const children = (parentData.children || []).filter(id => id !== childId);

        await updateDoc(parentRef, {
          children,
          isParent: children.length > 0
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error unlinking child:', error);
      throw error;
    }
  }
}

export const parentLinkService = new ParentLinkService();
export default parentLinkService;

