// Contact Service - Manage user contacts and approvals
// Allows users to only chat with approved contacts

import { db } from './firebaseConfig';
import { collection, doc, getDoc, setDoc, getDocs, query, where, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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

      // Normalize user IDs to ensure they're strings and trimmed
      const normalizedFromUserId = String(fromUserId).trim();
      const normalizedToUserId = String(toUserId).trim();
      
      // Get user emails for dual lookup (best practice from top messaging apps)
      // This allows querying by both UID and email if UID doesn't match
      let fromUserEmail = null;
      let toUserEmail = null;
      
      try {
        const fromUserDoc = await getDoc(doc(db, 'users', normalizedFromUserId));
        if (fromUserDoc.exists()) {
          fromUserEmail = fromUserDoc.data().email || null;
        }
        
        const toUserDoc = await getDoc(doc(db, 'users', normalizedToUserId));
        if (toUserDoc.exists()) {
          toUserEmail = toUserDoc.data().email || null;
        } else {
          console.warn('⚠️ Receiver user document not found in Firestore!');
          console.warn('   This may cause issues - the toUserId might not match their Firebase Auth UID');
          console.warn('   toUserId:', normalizedToUserId);
        }
      } catch (error) {
        console.error('Error fetching user emails:', error);
        // Continue anyway - emails are optional but helpful
      }
      
      // Create contact request with dual identifiers (UID + email)
      // This follows best practices from Discord/Facebook Messenger
      const requestId = `${normalizedFromUserId}_${normalizedToUserId}`;
      const requestRef = doc(db, 'contactRequests', requestId);
      
      const requestData = {
        fromUserId: normalizedFromUserId,
        fromUserEmail: fromUserEmail, // Added for dual lookup
        toUserId: normalizedToUserId,
        toUserEmail: toUserEmail,     // Added for dual lookup
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      console.log('📤 Creating contact request:', {
        requestId,
        fromUserId: normalizedFromUserId,
        toUserId: normalizedToUserId,
        fromUserIdType: typeof normalizedFromUserId,
        toUserIdType: typeof normalizedToUserId,
        fromUserIdLength: normalizedFromUserId.length,
        toUserIdLength: normalizedToUserId.length,
        originalFromUserId: fromUserId,
        originalToUserId: toUserId,
        status: 'pending'
      });
      
      // Verify the toUserId matches what will be queried
      console.log('🔍 Verification: toUserId will be queried as:', normalizedToUserId);
      console.log('🔍 Verification: Receiver should query with their Firebase Auth UID');
      console.log('🔍 Verification: If receiver\'s UID !==', normalizedToUserId, ', request won\'t be found!');
      
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
          toUserIdMatch: savedData.toUserId === normalizedToUserId,
          fromUserIdMatch: savedData.fromUserId === normalizedFromUserId
        });
        
        // Additional verification: Check if document can be queried
        const testQuery = query(
          collection(db, 'contactRequests'),
          where('toUserId', '==', normalizedToUserId),
          where('status', '==', 'pending')
        );
        const testSnapshot = await getDocs(testQuery);
        const foundInQuery = testSnapshot.docs.some(doc => doc.id === requestId);
        
        if (foundInQuery) {
          console.log('✅ Document is queryable (can be found by receiver)');
          console.log('✅ Receiver should be able to see this request when querying with toUserId:', normalizedToUserId);
        } else {
          console.warn('⚠️ Document exists but not found in query - may be a Firestore rules or index issue');
          console.warn('⚠️ Query used toUserId:', normalizedToUserId);
          console.warn('⚠️ This might indicate:');
          console.warn('   1. Firestore composite index not created');
          console.warn('   2. Firestore rules blocking the query');
          console.warn('   3. toUserId mismatch (document has different toUserId than query)');
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
   * Subscribe to pending contact requests for a user (real-time)
   * @param {string} userId - User's ID
   * @param {Function} callback - Callback function that receives the requests array
   * @returns {Function} Unsubscribe function
   */
  subscribeToPendingRequests(userId, callback) {
    try {
      // Normalize userId to ensure it's a string and trimmed
      const normalizedUserId = String(userId).trim();
      
      // Get user email for dual lookup (best practice from top messaging apps)
      // This handles cases where UID might not match exactly
      let userEmail = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', normalizedUserId));
        if (userDoc.exists()) {
          userEmail = userDoc.data().email || null;
          console.log('👂 User email for fallback:', userEmail);
        }
      } catch (error) {
        console.error('Error fetching user email for query:', error);
      }
      
      const requestsRef = collection(db, 'contactRequests');
      
      // Primary query: by toUserId (most common case)
      const primaryQuery = query(
        requestsRef,
        where('toUserId', '==', normalizedUserId),
        where('status', '==', 'pending')
      );

      console.log('👂 Setting up real-time listener for pending requests:', normalizedUserId);
      console.log('👂 Listener userId type:', typeof normalizedUserId, 'length:', normalizedUserId.length);
      console.log('👂 Original userId:', userId, 'type:', typeof userId);
      
      // Set up primary listener
      const unsubscribe = onSnapshot(
        primaryQuery,
        async (snapshot) => {
          console.log('📬 Real-time update: pending requests changed. Count:', snapshot.size);
          
          let finalSnapshot = snapshot;
          
          // If no results and we have email, try fallback query by email
          // This follows best practices from top messaging apps (dual lookup)
          if (snapshot.size === 0 && userEmail) {
            console.log('⚠️ No results by UID in real-time listener, trying fallback query by email...');
            try {
              const fallbackQuery = query(
                requestsRef,
                where('toUserEmail', '==', userEmail),
                where('status', '==', 'pending')
              );
              const fallbackSnapshot = await getDocs(fallbackQuery);
              console.log('📊 Fallback query result (by email):', fallbackSnapshot.size, 'documents found');
              
              if (fallbackSnapshot.size > 0) {
                console.warn('⚠️ MISMATCH DETECTED in real-time listener: Found requests by email but not by UID!');
                console.warn('   This means the toUserId in documents does not match the receiver\'s Firebase Auth UID');
                console.warn('   Query UID:', normalizedUserId);
                console.warn('   Query Email:', userEmail);
                
                // Create a snapshot-like object from the fallback results
                finalSnapshot = {
                  docs: fallbackSnapshot.docs,
                  size: fallbackSnapshot.size,
                  empty: fallbackSnapshot.empty
                };
              }
            } catch (error) {
              console.error('Error in fallback query:', error);
            }
          }
          
          // Debug: Log all documents to check for ID mismatches
          if (finalSnapshot.size > 0) {
            finalSnapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const toUserIdMatch = String(data.toUserId) === String(normalizedUserId);
              console.log('📄 Request in snapshot:', {
                id: docSnap.id,
                fromUserId: data.fromUserId,
                toUserId: data.toUserId,
                toUserIdType: typeof data.toUserId,
                toUserIdLength: data.toUserId?.length,
                queryUserId: normalizedUserId,
                queryUserIdType: typeof normalizedUserId,
                queryUserIdLength: normalizedUserId.length,
                matches: toUserIdMatch
              });
              
              if (!toUserIdMatch) {
                console.error('❌ ID MISMATCH in real-time listener!');
                console.error('   Document toUserId:', data.toUserId, `(${typeof data.toUserId}, length: ${data.toUserId?.length})`);
                console.error('   Query userId:', normalizedUserId, `(${typeof normalizedUserId}, length: ${normalizedUserId.length})`);
              }
            });
          }
          
          // Fetch all user data in parallel
          const requestPromises = finalSnapshot.docs.map(async (docSnap) => {
            const requestData = docSnap.data();
            
            // Get sender user details
            try {
              const userDoc = await getDoc(doc(db, 'users', requestData.fromUserId));
              if (userDoc.exists()) {
                return {
                  id: docSnap.id,
                  ...requestData,
                  fromUser: {
                    id: requestData.fromUserId,
                    ...userDoc.data()
                  }
                };
              } else {
                console.warn('⚠️ Sender user not found for request:', requestData.fromUserId);
                return null;
              }
            } catch (error) {
              console.error('Error fetching sender user:', error);
              return null;
            }
          });

          // Wait for all user data to be fetched
          const requests = (await Promise.all(requestPromises)).filter(req => req !== null);

          console.log('✅ Real-time callback with', requests.length, 'pending requests');
          callback(requests);
        },
        (error) => {
          console.error('❌ Error in real-time listener for pending requests:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up real-time listener:', error);
      callback([]);
      return () => {}; // Return no-op unsubscribe function
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
      console.log('🔍 Query userId:', userId);
      console.log('🔍 Query userId type:', typeof userId);
      console.log('🔍 Query userId length:', userId?.length);
      
      const allSnapshot = await getDocs(allRequestsQuery);
      console.log('📊 All requests found (any status):', allSnapshot.size);
      
      if (allSnapshot.size === 0) {
        console.warn('⚠️ No requests found at all! This could mean:');
        console.warn('   1. No requests have been sent to this user');
        console.warn('   2. The toUserId in documents doesn\'t match this userId');
        console.warn('   3. Firestore rules are blocking the query');
      }
      
      allSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const toUserIdMatch = data.toUserId === userId;
        const toUserIdStrictMatch = String(data.toUserId) === String(userId);
        
        console.log('📄 Request document:', {
          id: docSnap.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          status: data.status,
          toUserIdType: typeof data.toUserId,
          toUserIdLength: data.toUserId?.length,
          queryUserId: userId,
          queryUserIdType: typeof userId,
          queryUserIdLength: userId?.length,
          userIdMatch: toUserIdMatch,
          userIdStrictMatch: toUserIdStrictMatch,
          userIdsEqual: data.toUserId === userId,
          userIdsStringEqual: String(data.toUserId) === String(userId)
        });
        
        if (!toUserIdMatch) {
          console.error('❌ MISMATCH DETECTED!');
          console.error('   Document toUserId:', data.toUserId, `(${typeof data.toUserId}, length: ${data.toUserId?.length})`);
          console.error('   Query userId:', userId, `(${typeof userId}, length: ${userId?.length})`);
          console.error('   They are NOT equal!');
        }
      });
      
      // Now query with status filter
      // IMPORTANT: Ensure userId is a string and matches exactly
      const queryUserId = String(userId).trim();
      console.log('📡 Querying Firestore for pending requests (with status filter)...');
      console.log('📡 Query userId (normalized):', queryUserId, 'type:', typeof queryUserId, 'length:', queryUserId.length);
      
      // Get user email for potential fallback query
      let userEmail = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', queryUserId));
        if (userDoc.exists()) {
          userEmail = userDoc.data().email || null;
          console.log('📧 User email for fallback query:', userEmail);
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
      }
      
      // Primary query: by toUserId
      const q = query(
        requestsRef,
        where('toUserId', '==', queryUserId),
        where('status', '==', 'pending')
      );
      
      let snapshot = await getDocs(q);
      console.log('📊 Query result (pending only):', snapshot.size, 'documents found');
      
      // If no results and we have email, try fallback query by email
      // This follows best practices from top messaging apps (dual lookup)
      if (snapshot.size === 0 && userEmail) {
        console.log('⚠️ No results by UID, trying fallback query by email...');
        const fallbackQuery = query(
          requestsRef,
          where('toUserEmail', '==', userEmail),
          where('status', '==', 'pending')
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        console.log('📊 Fallback query result (by email):', fallbackSnapshot.size, 'documents found');
        
        if (fallbackSnapshot.size > 0) {
          console.warn('⚠️ MISMATCH DETECTED: Found requests by email but not by UID!');
          console.warn('   This means the toUserId in documents does not match the receiver\'s Firebase Auth UID');
          console.warn('   Query UID:', queryUserId);
          console.warn('   Query Email:', userEmail);
          fallbackSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            console.warn('   Document toUserId:', data.toUserId);
            console.warn('   Document toUserEmail:', data.toUserEmail);
          });
          
          // Use fallback results
          snapshot = fallbackSnapshot;
        }
      }

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

