// Contact Service - Manage user contacts and approvals
// Allows users to only chat with approved contacts

import { db } from './firebaseConfig';
import { collection, doc, getDoc, setDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestoreService } from './firestoreService';

class ContactService {
  /**
   * Send a contact request to another user
   * @param {string} fromUserId - Current user's ID
   * @param {string} toUserId - User to send request to
   * @returns {Promise<{success: boolean, requestId?: string}>}
   */
  async sendContactRequest(fromUserId, toUserId) {
    try {
      if (!fromUserId || !toUserId || fromUserId === toUserId) {
        throw new Error('Invalid user IDs');
      }

      // Check if already contacts
      const isContact = await this.isContact(fromUserId, toUserId);
      if (isContact) {
        return { success: false, error: 'Already a contact' };
      }

      // Check if request already exists
      const existingRequest = await this.getContactRequest(fromUserId, toUserId);
      if (existingRequest) {
        return { success: false, error: 'Request already sent' };
      }

      // Create contact request
      const requestId = `${fromUserId}_${toUserId}`;
      const requestRef = doc(db, 'contactRequests', requestId);
      
      const requestData = {
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      console.log('📤 Creating contact request:', {
        requestId,
        fromUserId,
        toUserId,
        fromUserIdType: typeof fromUserId,
        toUserIdType: typeof toUserId,
        fromUserIdLength: fromUserId?.length,
        toUserIdLength: toUserId?.length,
        status: 'pending'
      });
      
      try {
        await setDoc(requestRef, requestData);
        console.log('✅ setDoc() completed successfully');
      } catch (setDocError) {
        console.error('❌ Error calling setDoc():', setDocError);
        console.error('Error code:', setDocError.code);
        console.error('Error message:', setDocError.message);
        throw setDocError;
      }
      
      // Verify the request was saved correctly - try multiple times
      let verifyDoc = null;
      let verificationAttempts = 0;
      const maxAttempts = 3;
      
      while (verificationAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        verifyDoc = await getDoc(requestRef);
        
        if (verifyDoc.exists()) {
          break;
        }
        
        verificationAttempts++;
        if (verificationAttempts < maxAttempts) {
          console.log(`⚠️ Document not found yet, retrying... (attempt ${verificationAttempts + 1}/${maxAttempts})`);
        }
      }
      
      if (verifyDoc && verifyDoc.exists()) {
        const savedData = verifyDoc.data();
        console.log('✅ Contact request created and verified in Firestore:', {
          requestId,
          documentPath: `contactRequests/${requestId}`,
          savedFromUserId: savedData.fromUserId,
          savedToUserId: savedData.toUserId,
          savedStatus: savedData.status,
          createdAt: savedData.createdAt,
          updatedAt: savedData.updatedAt,
          toUserIdMatch: savedData.toUserId === toUserId,
          fromUserIdMatch: savedData.fromUserId === fromUserId
        });
        
        // Additional verification: Check if document can be queried
        const testQuery = query(
          collection(db, 'contactRequests'),
          where('toUserId', '==', toUserId),
          where('status', '==', 'pending')
        );
        const testSnapshot = await getDocs(testQuery);
        const foundInQuery = testSnapshot.docs.some(doc => doc.id === requestId);
        
        if (foundInQuery) {
          console.log('✅ Document is queryable (can be found by receiver)');
        } else {
          console.warn('⚠️ Document exists but not found in query - may be a Firestore rules or index issue');
        }
      } else {
        console.error('❌ Contact request was NOT saved to Firestore!');
        console.error('Document ID:', requestId);
        console.error('Collection: contactRequests');
        console.error('This may be a Firestore rules issue or network error');
      }
      
      return { success: true, requestId };
    } catch (error) {
      console.error('Error sending contact request:', error);
      throw error;
    }
  }

  /**
   * Accept a contact request
   * @param {string} userId - Current user's ID
   * @param {string} requestId - Contact request ID
   * @returns {Promise<{success: boolean}>}
   */
  async acceptContactRequest(userId, requestId) {
    try {
      const requestRef = doc(db, 'contactRequests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }

      const requestData = requestSnap.data();
      
      if (requestData.toUserId !== userId) {
        throw new Error('Not authorized to accept this request');
      }

      if (requestData.status !== 'pending') {
        throw new Error('Request already processed');
      }

      // Update request status
      await updateDoc(requestRef, {
        status: 'accepted',
        updatedAt: Date.now()
      });

      // Add both users as contacts
      await this.addContact(requestData.fromUserId, requestData.toUserId);

      return { success: true };
    } catch (error) {
      console.error('Error accepting contact request:', error);
      throw error;
    }
  }

  /**
   * Reject a contact request
   * @param {string} userId - Current user's ID
   * @param {string} requestId - Contact request ID
   * @returns {Promise<{success: boolean}>}
   */
  async rejectContactRequest(userId, requestId) {
    try {
      const requestRef = doc(db, 'contactRequests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }

      const requestData = requestSnap.data();
      
      if (requestData.toUserId !== userId) {
        throw new Error('Not authorized to reject this request');
      }

      // Delete the request
      await deleteDoc(requestRef);

      return { success: true };
    } catch (error) {
      console.error('Error rejecting contact request:', error);
      throw error;
    }
  }

  /**
   * Add a contact (internal method)
   * @param {string} userId1 - First user's ID
   * @param {string} userId2 - Second user's ID
   */
  async addContact(userId1, userId2) {
    try {
      // Create bidirectional contact relationship
      const contactId1 = `${userId1}_${userId2}`;
      const contactId2 = `${userId2}_${userId1}`;

      const contactRef1 = doc(db, 'contacts', contactId1);
      const contactRef2 = doc(db, 'contacts', contactId2);

      await Promise.all([
        setDoc(contactRef1, {
          userId: userId1,
          contactId: userId2,
          createdAt: Date.now()
        }),
        setDoc(contactRef2, {
          userId: userId2,
          contactId: userId1,
          createdAt: Date.now()
        })
      ]);
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  /**
   * Check if two users are contacts
   * @param {string} userId1 - First user's ID
   * @param {string} userId2 - Second user's ID
   * @returns {Promise<boolean>}
   */
  async isContact(userId1, userId2) {
    try {
      const contactId = `${userId1}_${userId2}`;
      const contactRef = doc(db, 'contacts', contactId);
      const contactSnap = await getDoc(contactRef);
      return contactSnap.exists();
    } catch (error) {
      console.error('Error checking contact:', error);
      return false;
    }
  }

  /**
   * Get all contacts for a user
   * @param {string} userId - User's ID
   * @returns {Promise<Array>}
   */
  async getContacts(userId) {
    try {
      const contactsRef = collection(db, 'contacts');
      const q = query(contactsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const contacts = [];
      for (const docSnap of snapshot.docs) {
        const contactData = docSnap.data();
        // Get contact user details
        const userDoc = await getDoc(doc(db, 'users', contactData.contactId));
        if (userDoc.exists()) {
          contacts.push({
            id: contactData.contactId,
            ...userDoc.data(),
            contactId: docSnap.id
          });
        }
      }

      return contacts;
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  /**
   * Get pending contact requests for a user
   * @param {string} userId - User's ID
   * @returns {Promise<Array>}
   */
  async getPendingRequests(userId) {
    try {
      console.log('🔍 getPendingRequests called for userId:', userId);
      console.log('🔍 userId type:', typeof userId);
      console.log('🔍 userId length:', userId?.length);
      
      const requestsRef = collection(db, 'contactRequests');
      
      // First, try to get all requests for this user (without status filter) for debugging
      const allRequestsQuery = query(
        requestsRef,
        where('toUserId', '==', userId)
      );
      
      console.log('📡 Querying Firestore for ALL requests (toUserId only)...');
      const allSnapshot = await getDocs(allRequestsQuery);
      console.log('📊 All requests found (any status):', allSnapshot.size);
      
      allSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('📄 Request document:', {
          id: docSnap.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          status: data.status,
          toUserIdType: typeof data.toUserId,
          toUserIdLength: data.toUserId?.length,
          userIdMatch: data.toUserId === userId
        });
      });
      
      // Now query with status filter
      const q = query(
        requestsRef,
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );
      
      console.log('📡 Querying Firestore for pending requests (with status filter)...');
      const snapshot = await getDocs(q);
      console.log('📊 Query result (pending only):', snapshot.size, 'documents found');

      const requests = [];
      for (const docSnap of snapshot.docs) {
        const requestData = docSnap.data();
        console.log('📄 Request found:', {
          id: docSnap.id,
          fromUserId: requestData.fromUserId,
          toUserId: requestData.toUserId,
          status: requestData.status
        });
        
        // Get sender user details
        const userDoc = await getDoc(doc(db, 'users', requestData.fromUserId));
        if (userDoc.exists()) {
          requests.push({
            id: docSnap.id,
            ...requestData,
            fromUser: {
              id: requestData.fromUserId,
              ...userDoc.data()
            }
          });
        } else {
          console.warn('⚠️ Sender user not found for request:', requestData.fromUserId);
        }
      }

      console.log('✅ Returning', requests.length, 'pending requests');
      return requests;
    } catch (error) {
      console.error('❌ Error getting pending requests:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Get contact request between two users
   * @param {string} fromUserId - Sender's ID
   * @param {string} toUserId - Receiver's ID
   * @returns {Promise<Object|null>}
   */
  async getContactRequest(fromUserId, toUserId) {
    try {
      const requestId = `${fromUserId}_${toUserId}`;
      const requestRef = doc(db, 'contactRequests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (requestSnap.exists()) {
        return { id: requestSnap.id, ...requestSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting contact request:', error);
      return null;
    }
  }

  /**
   * Get contact requests sent by a user (outgoing requests)
   * @param {string} userId - User's ID
   * @returns {Promise<Array>}
   */
  async getSentRequests(userId) {
    try {
      const requestsRef = collection(db, 'contactRequests');
      const q = query(
        requestsRef,
        where('fromUserId', '==', userId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(docSnap => {
        const requestData = docSnap.data();
        return {
          id: docSnap.id,
          toUserId: requestData.toUserId,
          ...requestData
        };
      });
    } catch (error) {
      console.error('Error getting sent requests:', error);
      return [];
    }
  }

  /**
   * Remove a contact
   * @param {string} userId - Current user's ID
   * @param {string} contactId - Contact to remove
   * @returns {Promise<{success: boolean}>}
   */
  async removeContact(userId, contactId) {
    try {
      const contactId1 = `${userId}_${contactId}`;
      const contactId2 = `${contactId}_${userId}`;

      await Promise.all([
        deleteDoc(doc(db, 'contacts', contactId1)),
        deleteDoc(doc(db, 'contacts', contactId2))
      ]);

      return { success: true };
    } catch (error) {
      console.error('Error removing contact:', error);
      throw error;
    }
  }
}

export const contactService = new ContactService();
export default contactService;

