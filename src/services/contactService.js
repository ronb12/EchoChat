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
        fromUserEmail: fromUserEmail,
        toUserId: normalizedToUserId,
        toUserEmail: toUserEmail,
        fromUserIdType: typeof normalizedFromUserId,
        toUserIdType: typeof normalizedToUserId,
        fromUserIdLength: normalizedFromUserId.length,
        toUserIdLength: normalizedToUserId.length,
        originalFromUserId: fromUserId,
        originalToUserId: toUserId,
        status: 'pending'
      });

      // CRITICAL: Log exact values that will be stored and queried
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 CONTACT REQUEST DETAILS (EXACT VALUES):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Document ID (requestId):', requestId);
      console.log('   fromUserId (stored):', normalizedFromUserId);
      console.log('   fromUserEmail (stored):', fromUserEmail || 'NOT FOUND');
      console.log('   toUserId (stored):', normalizedToUserId);
      console.log('   toUserEmail (stored):', toUserEmail || 'NOT FOUND');
      console.log('');
      console.log('   ⚠️ CRITICAL: Receiver will query with:');
      console.log('      - toUserId == receiver\'s Firebase Auth UID');
      console.log('      - toUserEmail == receiver\'s email (fallback)');
      console.log('');
      console.log('   🔍 VERIFICATION NEEDED:');
      console.log('      - Does toUserId match receiver\'s Firebase Auth UID?');
      console.log('      - Does toUserEmail match receiver\'s email exactly?');
      console.log('      - If NO to either, request won\'t be found!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Contact request created and verified in Firestore:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Document Path: contactRequests/' + requestId);
        console.log('   fromUserId (saved):', savedData.fromUserId);
        console.log('   fromUserEmail (saved):', savedData.fromUserEmail || 'MISSING');
        console.log('   toUserId (saved):', savedData.toUserId);
        console.log('   toUserEmail (saved):', savedData.toUserEmail || 'MISSING');
        console.log('   status (saved):', savedData.status);
        console.log('   createdAt:', savedData.createdAt ? new Date(savedData.createdAt).toISOString() : 'N/A');
        console.log('');
        console.log('   ✅ Verification:');
        console.log('      fromUserId match:', savedData.fromUserId === normalizedFromUserId ? '✅ YES' : '❌ NO');
        console.log('      toUserId match:', savedData.toUserId === normalizedToUserId ? '✅ YES' : '❌ NO');
        console.log('      fromUserEmail stored:', savedData.fromUserEmail ? '✅ YES' : '❌ NO');
        console.log('      toUserEmail stored:', savedData.toUserEmail ? '✅ YES' : '❌ NO');
        console.log('');
        console.log('   📋 Receiver must query with:');
        console.log('      - toUserId ==', savedData.toUserId);
        console.log('      - toUserEmail ==', savedData.toUserEmail || '(not stored)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Additional verification: Check if document can be queried
        const testQuery = query(
          collection(db, 'contactRequests'),
          where('toUserId', '==', normalizedToUserId),
          where('status', '==', 'pending')
        );
        const testSnapshot = await getDocs(testQuery);
        const foundInQuery = testSnapshot.docs.some(doc => doc.id === requestId);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 QUERY VERIFICATION:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (foundInQuery) {
          console.log('✅ Document is queryable (can be found by receiver)');
          console.log('✅ Receiver should be able to see this request when querying with:');
          console.log('      toUserId:', normalizedToUserId);
          console.log('      toUserEmail:', toUserEmail || '(not stored - fallback won\'t work)');
        } else {
          console.warn('⚠️ Document exists but NOT found in query!');
          console.warn('');
          console.warn('   Query used:');
          console.warn('      toUserId:', normalizedToUserId);
          console.warn('      status: pending');
          console.warn('');
          console.warn('   This might indicate:');
          console.warn('   1. Firestore composite index not created');
          console.warn('   2. Firestore rules blocking the query');
          console.warn('   3. toUserId mismatch (document has different toUserId than query)');
          console.warn('');
          console.warn('   💡 Check Firestore console to verify the document was saved correctly');
          console.warn('   💡 Run checkContactRequests() in browser console to debug');
        }

        // Also test email fallback query
        if (toUserEmail) {
          const emailTestQuery = query(
            collection(db, 'contactRequests'),
            where('toUserEmail', '==', toUserEmail),
            where('status', '==', 'pending')
          );
          const emailTestSnapshot = await getDocs(emailTestQuery);
          const foundInEmailQuery = emailTestSnapshot.docs.some(doc => doc.id === requestId);

          console.log('');
          console.log('   Email Fallback Query Test:');
          if (foundInEmailQuery) {
            console.log('   ✅ Document found by email query (fallback will work)');
          } else {
            console.warn('   ⚠️ Document NOT found by email query');
            console.warn('      Query used toUserEmail:', toUserEmail);
          }
        } else {
          console.warn('   ⚠️ toUserEmail not stored - email fallback query will not work!');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
      console.log('📥 acceptContactRequest called:', {
        userId,
        requestId,
        userIdType: typeof userId,
        userIdLength: userId?.length
      });

      const requestRef = doc(db, 'contactRequests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        console.error('❌ Request document does not exist:', requestId);
        throw new Error('Request not found');
      }

      const requestData = requestSnap.data();
      console.log('📄 Request data retrieved:', {
        toUserId: requestData.toUserId,
        toUserEmail: requestData.toUserEmail,
        fromUserId: requestData.fromUserId,
        status: requestData.status
      });

      // Normalize user IDs for comparison
      const normalizedUserId = String(userId).trim();
      const normalizedToUserId = String(requestData.toUserId || '').trim();

      console.log('🔍 Authorization check:', {
        normalizedUserId,
        normalizedToUserId,
        uidMatch: normalizedToUserId === normalizedUserId
      });

      // Check authorization: UID must match OR email must match (fallback for UID mismatches)
      let isAuthorized = normalizedToUserId === normalizedUserId;

      if (!isAuthorized) {
        // Fallback: Check by email if UID doesn't match
        // This handles cases where the toUserId stored doesn't match the receiver's Firebase Auth UID
        try {
          const userDoc = await getDoc(doc(db, 'users', normalizedUserId));
          if (userDoc.exists()) {
            const userEmail = userDoc.data().email || '';
            const requestEmail = requestData.toUserEmail || '';

            if (userEmail.toLowerCase().trim() === requestEmail.toLowerCase().trim()) {
              console.log('⚠️ UID mismatch but email matches - allowing accept');
              console.log('   Request toUserId:', normalizedToUserId);
              console.log('   User UID:', normalizedUserId);
              console.log('   Email match:', userEmail);
              isAuthorized = true;
            }
          }
        } catch (emailCheckError) {
          console.error('Error checking email for authorization:', emailCheckError);
          // Continue with UID check only
        }
      }

      if (!isAuthorized) {
        console.error('❌ Authorization failed:', {
          normalizedUserId,
          normalizedToUserId,
          requestEmail: requestData.toUserEmail
        });
        throw new Error('Not authorized to accept this request');
      }

      console.log('✅ Authorization passed, proceeding with accept');

      if (requestData.status !== 'pending') {
        console.error('❌ Request already processed:', requestData.status);
        throw new Error('Request already processed');
      }

      console.log('📝 Updating request status to accepted...');
      // Update request status
      await updateDoc(requestRef, {
        status: 'accepted',
        updatedAt: Date.now()
      });
      console.log('✅ Request status updated successfully');

      console.log('👥 Adding contact:', {
        fromUserId: requestData.fromUserId,
        toUserId: normalizedUserId
      });
      // Add both users as contacts
      // Use the actual userId (receiver's Firebase Auth UID) instead of the stored toUserId
      // This ensures the contact is created with the correct UID
      await this.addContact(requestData.fromUserId, normalizedUserId);
      console.log('✅ Contact added successfully');

      return { success: true };
    } catch (error) {
      console.error('❌ Error accepting contact request:', error);
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error name:', error.name);
      console.error('   Error stack:', error.stack);
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

      // Normalize user IDs for comparison
      const normalizedUserId = String(userId).trim();
      const normalizedToUserId = String(requestData.toUserId || '').trim();

      // Check authorization: UID must match OR email must match (fallback for UID mismatches)
      let isAuthorized = normalizedToUserId === normalizedUserId;

      if (!isAuthorized) {
        // Fallback: Check by email if UID doesn't match
        try {
          const userDoc = await getDoc(doc(db, 'users', normalizedUserId));
          if (userDoc.exists()) {
            const userEmail = userDoc.data().email || '';
            const requestEmail = requestData.toUserEmail || '';

            if (userEmail.toLowerCase().trim() === requestEmail.toLowerCase().trim()) {
              console.log('⚠️ UID mismatch but email matches - allowing reject');
              isAuthorized = true;
            }
          }
        } catch (emailCheckError) {
          console.error('Error checking email for authorization:', emailCheckError);
        }
      }

      if (!isAuthorized) {
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
  subscribeToPendingRequests(userId, callback, options = {}) {
    try {
      // Normalize userId to ensure it's a string and trimmed
      const normalizedUserId = String(userId).trim();

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

      // Get user email for fallback (async, but we'll fetch it in the callback)
      const { userEmail: providedUserEmail = null } = options || {};
      let userEmailPromise = null;
      if (providedUserEmail) {
        console.log('👂 Using provided user email for fallback:', providedUserEmail);
        userEmailPromise = Promise.resolve(providedUserEmail);
      } else {
        try {
          userEmailPromise = getDoc(doc(db, 'users', normalizedUserId)).then(doc => {
            if (doc.exists()) {
              const email = doc.data().email || null;
              console.log('👂 User email for fallback:', email);
              return email;
            }
            return null;
          }).catch(err => {
            if (err?.code === 'permission-denied') {
              console.warn('⚠️ Permission denied fetching user email for listener; continuing without email');
            } else {
              console.warn('⚠️ Error fetching user email for listener:', err?.message || err);
            }
            return null;
          });
        } catch (error) {
          console.warn('⚠️ Error setting up email fetch for listener:', error?.message || error);
        }
      }

      // Set up primary listener
      const unsubscribe = onSnapshot(
        primaryQuery,
        async (snapshot) => {
          console.log('📬 Real-time update: pending requests changed. Count:', snapshot.size);

          let finalSnapshot = snapshot;

          // If no results, try fallback query by email
          // This follows best practices from top messaging apps (dual lookup)
          if (snapshot.size === 0 && userEmailPromise) {
            const userEmail = await userEmailPromise;
            if (userEmail) {
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
  async getPendingRequests(userId, options = {}) {
    const { userEmail: providedUserEmail = null } = options || {};
    try {
      console.log('🔍 getPendingRequests called for userId:', userId);
      console.log('🔍 userId type:', typeof userId);
      console.log('🔍 userId length:', userId?.length);

      const requestsRef = collection(db, 'contactRequests');

      // First, try to get all requests for this user (without status filter) for debugging
      const normalizedUserId = String(userId).trim();
      const allRequestsQuery = query(
        requestsRef,
        where('toUserId', '==', normalizedUserId)
      );

      console.log('📡 Querying Firestore for ALL requests (toUserId only)...');
      console.log('🔍 Query userId:', userId);
      console.log('🔍 Query userId type:', typeof userId);
      console.log('🔍 Query userId length:', userId?.length);

      const allSnapshot = await getDocs(allRequestsQuery);
      console.log('📊 All requests found (any status):', allSnapshot.size);

      if (allSnapshot.size === 0) {
        console.log('ℹ️ No contact request documents found for this user (normal if no requests have been sent).');
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
      const queryUserId = normalizedUserId;
      console.log('📡 Querying Firestore for pending requests (with status filter)...');
      console.log('📡 Query userId (normalized):', queryUserId, 'type:', typeof queryUserId, 'length:', queryUserId.length);

      // Get user email for potential fallback query
      let userEmail = providedUserEmail || null;
      if (!userEmail) {
        try {
          const userDoc = await getDoc(doc(db, 'users', queryUserId));
          if (userDoc.exists()) {
            userEmail = userDoc.data().email || null;
            console.log('📧 User email for fallback query:', userEmail);
          }
        } catch (error) {
          if (error?.code === 'permission-denied') {
            console.warn('⚠️ Permission denied fetching user email; continuing without fallback email');
          } else {
            console.warn('⚠️ Error fetching user email for fallback:', error?.message || error);
          }
        }
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
   * Delete a contact request between two users
   * @param {string} fromUserId - Sender's ID
   * @param {string} toUserId - Receiver's ID
   * @returns {Promise<{success: boolean}>}
   */
  async deleteContactRequest(fromUserId, toUserId) {
    try {
      const normalizedFromUserId = String(fromUserId).trim();
      const normalizedToUserId = String(toUserId).trim();
      const requestId = `${normalizedFromUserId}_${normalizedToUserId}`;
      const requestRef = doc(db, 'contactRequests', requestId);

      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        await deleteDoc(requestRef);
        console.log(`✅ Deleted contact request: ${requestId}`);
        return { success: true };
      } else {
        console.log(`ℹ️ Contact request not found: ${requestId}`);
        return { success: false, error: 'Request not found' };
      }
    } catch (error) {
      console.error('Error deleting contact request:', error);
      return { success: false, error: error.message };
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

                                                                                                                                                                                                                                                                                                                                                                                                                                                                              