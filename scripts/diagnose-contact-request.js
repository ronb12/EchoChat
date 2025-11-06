/**
 * Diagnose Contact Request Issue
 * Run this in browser console to check Firestore documents
 */

// Instructions:
// 1. Open browser console (F12)
// 2. Log in as ronellbradley@bradleyvs.com
// 3. Send a contact request to ronellbradley@gmail.com
// 4. Copy and paste this entire script into the console
// 5. It will check:
//    - Current user's userId
//    - All contactRequests documents
//    - Specific request document
//    - Query results

(async function diagnoseContactRequest() {
  console.log('🔍 DIAGNOSING CONTACT REQUEST ISSUE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Import Firebase functions
    const { db, auth } = await import('./src/services/firebaseConfig.js');
    const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
    
    // Get current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ No user logged in!');
      return;
    }
    
    console.log('✅ Current User:', {
      uid: currentUser.uid,
      email: currentUser.email,
      uidLength: currentUser.uid.length,
      uidType: typeof currentUser.uid
    });
    
    // Get the other user's ID (you'll need to replace this)
    const otherUserEmail = currentUser.email === 'ronellbradley@bradleyvs.com' 
      ? 'ronellbradley@gmail.com' 
      : 'ronellbradley@bradleyvs.com';
    
    console.log('🔍 Looking for requests involving:', otherUserEmail);
    
    // Get user document for the other user
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', otherUserEmail));
    const userSnapshot = await getDocs(userQuery);
    
    let otherUserId = null;
    if (!userSnapshot.empty) {
      otherUserId = userSnapshot.docs[0].id;
      console.log('✅ Found other user:', {
        email: otherUserEmail,
        userId: otherUserId,
        userIdLength: otherUserId.length,
        userIdType: typeof otherUserId
      });
    } else {
      console.error('❌ Other user not found in Firestore!');
      console.log('📋 Searching all users...');
      const allUsersSnapshot = await getDocs(usersRef);
      allUsersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email === otherUserEmail) {
          otherUserId = doc.id;
          console.log('✅ Found user with different query:', {
            email: otherUserEmail,
            userId: otherUserId,
            docId: doc.id
          });
        }
      });
    }
    
    if (!otherUserId) {
      console.error('❌ Could not find other user ID!');
      return;
    }
    
    // Check both possible request IDs
    const requestId1 = `${currentUser.uid}_${otherUserId}`;
    const requestId2 = `${otherUserId}_${currentUser.uid}`;
    
    console.log('🔍 Checking request documents:');
    console.log('   Request ID 1:', requestId1);
    console.log('   Request ID 2:', requestId2);
    
    // Check first request document
    const requestRef1 = doc(db, 'contactRequests', requestId1);
    const requestSnap1 = await getDoc(requestRef1);
    
    if (requestSnap1.exists()) {
      const data1 = requestSnap1.data();
      console.log('✅ Request document 1 EXISTS:', {
        id: requestSnap1.id,
        fromUserId: data1.fromUserId,
        toUserId: data1.toUserId,
        status: data1.status,
        createdAt: data1.createdAt,
        fromUserIdMatch: data1.fromUserId === currentUser.uid,
        toUserIdMatch: data1.toUserId === otherUserId
      });
    } else {
      console.log('❌ Request document 1 does NOT exist');
    }
    
    // Check second request document
    const requestRef2 = doc(db, 'contactRequests', requestId2);
    const requestSnap2 = await getDoc(requestRef2);
    
    if (requestSnap2.exists()) {
      const data2 = requestSnap2.data();
      console.log('✅ Request document 2 EXISTS:', {
        id: requestSnap2.id,
        fromUserId: data2.fromUserId,
        toUserId: data2.toUserId,
        status: data2.status,
        createdAt: data2.createdAt,
        fromUserIdMatch: data2.fromUserId === currentUser.uid,
        toUserIdMatch: data2.toUserId === otherUserId
      });
    } else {
      console.log('❌ Request document 2 does NOT exist');
    }
    
    // Query all contact requests
    console.log('\n📡 Querying ALL contact requests...');
    const allRequestsRef = collection(db, 'contactRequests');
    const allRequestsSnapshot = await getDocs(allRequestsRef);
    
    console.log(`📊 Total contact requests in Firestore: ${allRequestsSnapshot.size}`);
    
    allRequestsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log('📄 Request:', {
        id: docSnap.id,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        status: data.status,
        involvesCurrentUser: data.fromUserId === currentUser.uid || data.toUserId === currentUser.uid,
        involvesOtherUser: data.fromUserId === otherUserId || data.toUserId === otherUserId
      });
    });
    
    // Test the query that getPendingRequests uses
    console.log('\n🔍 Testing getPendingRequests query...');
    const pendingQuery = query(
      allRequestsRef,
      where('toUserId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    
    try {
      const pendingSnapshot = await getDocs(pendingQuery);
      console.log(`📊 Pending requests for current user: ${pendingSnapshot.size}`);
      
      pendingSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        console.log('📄 Pending request:', {
          id: docSnap.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          status: data.status,
          toUserIdMatch: data.toUserId === currentUser.uid
        });
      });
    } catch (queryError) {
      console.error('❌ Query error:', queryError);
      console.error('Error code:', queryError.code);
      console.error('Error message:', queryError.message);
      
      if (queryError.code === 'failed-precondition') {
        console.error('⚠️ Index not built yet! Check Firebase Console for index status.');
      }
    }
    
    // Test query without status filter
    console.log('\n🔍 Testing query without status filter...');
    const simpleQuery = query(
      allRequestsRef,
      where('toUserId', '==', currentUser.uid)
    );
    
    try {
      const simpleSnapshot = await getDocs(simpleQuery);
      console.log(`📊 All requests to current user (any status): ${simpleSnapshot.size}`);
      
      simpleSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        console.log('📄 Request to current user:', {
          id: docSnap.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          status: data.status,
          toUserIdMatch: data.toUserId === currentUser.uid
        });
      });
    } catch (queryError) {
      console.error('❌ Simple query error:', queryError);
    }
    
    console.log('\n✅ DIAGNOSIS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    console.error('Error stack:', error.stack);
  }
})();

