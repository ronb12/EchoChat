/**
 * Test Encryption Functionality
 * Verifies that encryption/decryption is working correctly
 */

// Test Web Crypto API (browser environment)
async function testEncryption() {
  console.log('🔐 Testing EchoChat Encryption...\n');

  try {
    // Check if Web Crypto API is available
    if (!window.crypto || !window.crypto.subtle) {
      console.error('❌ Web Crypto API not available');
      return false;
    }
    console.log('✅ Web Crypto API available');

    // Test basic encryption
    const testMessage = 'Hello, this is a test message!';
    const encoder = new TextEncoder();
    const data = encoder.encode(testMessage);

    // Generate a key
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
    console.log('✅ AES-256 key generated');

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    console.log('✅ IV generated');

    // Encrypt
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      data
    );
    console.log('✅ Message encrypted');

    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      encrypted
    );
    console.log('✅ Message decrypted');

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decrypted);

    if (decryptedText === testMessage) {
      console.log('✅ Encryption/Decryption test PASSED');
      console.log(`   Original: "${testMessage}"`);
      console.log(`   Decrypted: "${decryptedText}"`);
      return true;
    } else {
      console.error('❌ Encryption/Decryption test FAILED');
      console.log(`   Expected: "${testMessage}"`);
      console.log(`   Got: "${decryptedText}"`);
      return false;
    }
  } catch (error) {
    console.error('❌ Encryption test error:', error);
    return false;
  }
}

// Run test if in browser
if (typeof window !== 'undefined') {
  testEncryption().then(success => {
    if (success) {
      console.log('\n🎉 Encryption is working correctly!');
    } else {
      console.log('\n⚠️  Encryption test failed');
    }
  });
} else {
  console.log('⚠️  This test must be run in a browser environment');
  console.log('   Open the browser console and run: testEncryption()');
}


