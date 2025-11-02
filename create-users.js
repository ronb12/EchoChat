// Create test users for EchoChat using Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
admin.initializeApp({
  projectId: 'echochat-messaging'
});

async function createTestUsers() {
  try {
    console.log('🚀 Creating test users for EchoChat...\n');

    // Test User 1
    const user1 = await admin.auth().createUser({
      email: 'testuser1@echochat.com',
      password: 'TestUser123!',
      displayName: 'Test User 1',
      photoURL: 'https://via.placeholder.com/150/16213e/e94560?text=T1',
      emailVerified: true
    });
    console.log('✅ Test User 1 created:');
    console.log('   Email: testuser1@echochat.com');
    console.log('   Password: TestUser123!');
    console.log('   UID:', user1.uid);
    console.log('   Display Name: Test User 1\n');

    // Test User 2
    const user2 = await admin.auth().createUser({
      email: 'testuser2@echochat.com',
      password: 'TestUser123!',
      displayName: 'Test User 2',
      photoURL: 'https://via.placeholder.com/150/16213e/e94560?text=T2',
      emailVerified: true
    });
    console.log('✅ Test User 2 created:');
    console.log('   Email: testuser2@echochat.com');
    console.log('   Password: TestUser123!');
    console.log('   UID:', user2.uid);
    console.log('   Display Name: Test User 2\n');

    console.log('🎉 Both test users created successfully!');
    console.log('\n📱 You can now test EchoChat by:');
    console.log('1. Opening https://echochat-messaging.web.app');
    console.log('2. Signing in with either test user');
    console.log('3. Testing the messaging interface');

  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.log('\n💡 The test users may already exist. Check the Firebase Console:');
      console.log('https://console.firebase.google.com/project/echochat-messaging/authentication/users');
    } else if (error.code === 'auth/operation-not-allowed') {
      console.log('\n💡 Email/Password authentication may not be enabled. Please:');
      console.log('1. Go to Firebase Console → Authentication → Sign-in method');
      console.log('2. Enable Email/Password provider');
      console.log('3. Run this script again');
    }
  }
}

createTestUsers();
