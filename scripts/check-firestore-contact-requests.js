/**
 * Check Firestore Contact Requests
 * 
 * Run this in the browser console to check what's actually stored in Firestore
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: checkContactRequests()
 */

async function checkContactRequests() {
  console.log('🔍 Checking Firestore Contact Requests...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Import Firebase
    const { db } = await import('./src/services/firebaseConfig.js');
    const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
    const { auth } = await import('./src/services/firebaseConfig.js');

    // Get current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('❌ No user logged in');
      return;
    }

    console.log('📋 Current User:');
    console.log('   UID:', currentUser.uid);
    console.log('   Email:', currentUser.email);
    console.log('   UID Type:', typeof currentUser.uid);
    console.log('   UID Length:', currentUser.uid.length);
    console.log('');

    // Get all contact requests
    const requestsRef = collection(db, 'contactRequests');
    const allSnapshot = await getDocs(requestsRef);

    console.log(`📊 Total contact requests in Firestore: ${allSnapshot.size}\n`);

    if (allSnapshot.size === 0) {
      console.log('⚠️ No contact requests found in Firestore');
      return;
    }

    // Analyze each request
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ALL CONTACT REQUESTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    allSnapshot.forEach((docSnap, index) => {
      const data = docSnap.data();
      console.log(`Request ${index + 1}:`);
      console.log('   Document ID:', docSnap.id);
      console.log('   fromUserId:', data.fromUserId, `(type: ${typeof data.fromUserId}, length: ${data.fromUserId?.length})`);
      console.log('   fromUserEmail:', data.fromUserEmail || 'NOT STORED');
      console.log('   toUserId:', data.toUserId, `(type: ${typeof data.toUserId}, length: ${data.toUserId?.length})`);
      console.log('   toUserEmail:', data.toUserEmail || 'NOT STORED');
      console.log('   status:', data.status);
      console.log('   createdAt:', data.createdAt ? new Date(data.createdAt).toISOString() : 'N/A');
      
      // Check if this request is for the current user
      const isForCurrentUser = (
        String(data.toUserId) === String(currentUser.uid) ||
        String(data.toUserEmail) === String(currentUser.email)
      );
      
      const isFromCurrentUser = (
        String(data.fromUserId) === String(currentUser.uid) ||
        String(data.fromUserEmail) === String(currentUser.email)
      );

      console.log('');
      console.log('   🔍 Analysis:');
      console.log('      Is FOR current user (toUserId/Email match):', isForCurrentUser ? '✅ YES' : '❌ NO');
      console.log('      Is FROM current user (fromUserId/Email match):', isFromCurrentUser ? '✅ YES' : '❌ NO');
      
      if (isForCurrentUser && data.status === 'pending') {
        console.log('      ⚠️ This request SHOULD be visible to current user!');
      }
      
      if (!isForCurrentUser && String(data.toUserId) !== String(currentUser.uid)) {
        console.log('      ⚠️ MISMATCH: toUserId does not match current user UID');
        console.log('         Document toUserId:', data.toUserId);
        console.log('         Current User UID:', currentUser.uid);
        console.log('         Match:', String(data.toUserId) === String(currentUser.uid) ? 'YES' : 'NO');
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // Check pending requests for current user
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PENDING REQUESTS FOR CURRENT USER:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const pendingForUser = [];
    allSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'pending') {
        const matchesByUID = String(data.toUserId) === String(currentUser.uid);
        const matchesByEmail = data.toUserEmail && String(data.toUserEmail) === String(currentUser.email);
        
        if (matchesByUID || matchesByEmail) {
          pendingForUser.push({
            id: docSnap.id,
            ...data,
            matchesByUID,
            matchesByEmail
          });
        }
      }
    });

    if (pendingForUser.length > 0) {
      console.log(`✅ Found ${pendingForUser.length} pending request(s) for current user:\n`);
      pendingForUser.forEach((req, i) => {
        console.log(`   Request ${i + 1}:`);
        console.log('      Document ID:', req.id);
        console.log('      fromUserId:', req.fromUserId);
        console.log('      fromUserEmail:', req.fromUserEmail || 'NOT STORED');
        console.log('      Matches by UID:', req.matchesByUID ? '✅ YES' : '❌ NO');
        console.log('      Matches by Email:', req.matchesByEmail ? '✅ YES' : '❌ NO');
        console.log('');
      });
    } else {
      console.log('⚠️ No pending requests found for current user');
      console.log('');
      console.log('   This could mean:');
      console.log('   1. No requests have been sent to this user');
      console.log('   2. The toUserId in documents doesn\'t match current user\'s UID');
      console.log('   3. The toUserEmail in documents doesn\'t match current user\'s email');
      console.log('   4. All requests have been accepted/rejected');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Check complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
    console.error('Stack:', error.stack);
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.checkContactRequests = checkContactRequests;
  console.log('✅ Function checkContactRequests() is now available');
  console.log('   Run: checkContactRequests()');
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.location) {
  console.log('💡 To check contact requests, run: checkContactRequests()');
}

