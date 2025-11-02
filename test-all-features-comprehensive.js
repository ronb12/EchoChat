const puppeteer = require('puppeteer');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const FEATURES_TO_TEST = [
  { name: 'End-to-End Encryption', priority: 'High', expected: false },
  { name: 'Real-time Messaging', priority: 'Critical', expected: true },
  { name: 'File Sharing', priority: 'Critical', expected: true },
  { name: 'Voice Messages', priority: 'Medium', expected: false },
  { name: 'Video Calls', priority: 'Low', expected: false },
  { name: 'Group Chats', priority: 'High', expected: false },
  { name: 'Message Reactions', priority: 'High', expected: true },
  { name: 'Message Editing', priority: 'High', expected: true },
  { name: 'Message Deletion', priority: 'High', expected: true },
  { name: 'Message Forwarding', priority: 'Medium', expected: false },
  { name: 'Message Pinning', priority: 'Low', expected: false },
  { name: 'Message Search', priority: 'Medium', expected: false }
];

let testResults = [];

function logFeature(feature, status, details = '') {
  testResults.push({ feature, status, details });
  const icon = status === 'working' ? '✅' : status === 'partial' ? '⚠️' : '❌';
  console.log(`${icon} ${feature.name} - ${status.toUpperCase()}${details ? ` (${details})` : ''}`);
}

async function runFeatureTests() {
  console.log('🚀 Comprehensive Feature Testing\n');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();
    
    page1.setDefaultTimeout(60000);
    page2.setDefaultTimeout(60000);
    
    console.log('\n📱 Loading app...');
    await page1.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);
    await page2.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(5000);
    
    // Login both pages
    console.log('\n🔐 Logging in users...');
    try {
      await page1.waitForSelector('[data-testid="get-started-btn"]', { timeout: 10000 });
      await page1.click('[data-testid="get-started-btn"]');
      await page1.waitForSelector('.modal', { timeout: 10000 });
      await delay(2000);
      await page1.type('#email', 'testuser1@echochat.com', { delay: 30 });
      await page1.type('#password', 'testpass123', { delay: 30 });
      await page1.click('button[type="submit"]');
      await page1.waitForFunction(() => !document.querySelector('.modal.active') && document.querySelector('#message-input'), { timeout: 10000 }).catch(() => delay(5000));
      
      await page2.waitForSelector('[data-testid="get-started-btn"]', { timeout: 10000 });
      await page2.click('[data-testid="get-started-btn"]');
      await page2.waitForSelector('.modal', { timeout: 10000 });
      await delay(2000);
      await page2.type('#email', 'testuser2@echochat.com', { delay: 30 });
      await page2.type('#password', 'testpass123', { delay: 30 });
      await page2.click('button[type="submit"]');
      await page2.waitForFunction(() => !document.querySelector('.modal.active') && document.querySelector('#message-input'), { timeout: 10000 }).catch(() => delay(5000));
    } catch (e) {
      console.log('Login error:', e.message);
    }
    
    await delay(2000);
    
    console.log('\n🧪 Testing Features...');
    console.log('='.repeat(60));
    
    // Test 1: End-to-End Encryption
    console.log('\n1. End-to-End Encryption (AES-256-GCM)');
    try {
      // Check if encryption code exists
      const hasEncryption = await page1.evaluate(() => {
        return typeof window.CryptoJS !== 'undefined' || 
               document.querySelector('script[src*="crypto"]') !== null ||
               window.location.href.includes('encrypt');
      });
      
      // Check if messages are encrypted
      const message = await page1.$('.message-text');
      if (message) {
        const msgText = await page1.evaluate(el => el.textContent, message);
        // Encrypted messages would be base64 strings, not plain text
        const looksEncrypted = /^[A-Za-z0-9+/=]{20,}$/.test(msgText);
        
        if (looksEncrypted) {
          logFeature({ name: 'End-to-End Encryption' }, 'working', 'Messages appear encrypted');
        } else {
          logFeature({ name: 'End-to-End Encryption' }, 'not_working', 'Messages are plaintext, no encryption detected');
        }
      } else {
        logFeature({ name: 'End-to-End Encryption' }, 'not_working', 'No encryption implementation found');
      }
    } catch (e) {
      logFeature({ name: 'End-to-End Encryption' }, 'not_working', e.message);
    }
    
    // Test 2: Real-time Messaging
    console.log('\n2. Real-time Messaging');
    try {
      await page1.type('#message-input', 'Real-time test message', { delay: 30 });
      await page1.keyboard.press('Enter');
      await delay(3000);
      
      const msgCount = await page2.$$eval('.message', els => els.length);
      if (msgCount > 0) {
        logFeature({ name: 'Real-time Messaging' }, 'working', `Messages sync across tabs (${msgCount} messages)`);
      } else {
        logFeature({ name: 'Real-time Messaging' }, 'not_working', 'Messages not syncing');
      }
    } catch (e) {
      logFeature({ name: 'Real-time Messaging' }, 'not_working', e.message);
    }
    
    // Test 3: File Sharing
    console.log('\n3. File Sharing');
    try {
      const attachBtn = await page1.$('.input-action-btn[title="Attach file"]');
      if (attachBtn) {
        await attachBtn.click();
        await delay(500);
        const fileInput = await page1.$('#file-input');
        if (fileInput) {
          logFeature({ name: 'File Sharing' }, 'working', 'File input available');
        } else {
          logFeature({ name: 'File Sharing' }, 'partial', 'Button exists but file input missing');
        }
      } else {
        logFeature({ name: 'File Sharing' }, 'not_working', 'Attach button not found');
      }
    } catch (e) {
      logFeature({ name: 'File Sharing' }, 'not_working', e.message);
    }
    
    // Test 4: Voice Messages
    console.log('\n4. Voice Messages');
    try {
      const voiceRecorder = await page1.$('.voice-recorder, [class*="voice"]');
      const voiceBtn = await page1.$('button[title*="voice"], button[title*="Voice"]');
      
      if (voiceRecorder || voiceBtn) {
        logFeature({ name: 'Voice Messages' }, 'partial', 'Component exists but needs testing');
      } else {
        logFeature({ name: 'Voice Messages' }, 'not_working', 'Voice recorder component not found');
      }
    } catch (e) {
      logFeature({ name: 'Voice Messages' }, 'not_working', e.message);
    }
    
    // Test 5: Video Calls
    console.log('\n5. Video Calls');
    try {
      const videoBtn = await page1.$('button[title*="video"], button[title*="Video"], button[title*="call"]');
      const webrtc = await page1.evaluate(() => {
        return typeof RTCPeerConnection !== 'undefined' || 
               typeof navigator.mediaDevices?.getUserMedia !== 'undefined';
      });
      
      if (videoBtn && webrtc) {
        logFeature({ name: 'Video Calls' }, 'partial', 'UI exists but not implemented');
      } else {
        logFeature({ name: 'Video Calls' }, 'not_working', 'Video calling not implemented');
      }
    } catch (e) {
      logFeature({ name: 'Video Calls' }, 'not_working', e.message);
    }
    
    // Test 6: Group Chats
    console.log('\n6. Group Chats');
    try {
      const newChatBtn = await page1.$('.new-chat-btn, button:has-text("New Chat")');
      if (newChatBtn) {
        await newChatBtn.click();
        await delay(2000);
        
        const groupChatModal = await page1.$('.modal:has-text("Group"), .modal:has-text("group"), #group-chat-modal');
        const canCreateGroup = await page1.evaluate(() => {
          return document.querySelector('.group-chat-modal, [class*="group"]') !== null;
        });
        
        if (groupChatModal || canCreateGroup) {
          logFeature({ name: 'Group Chats' }, 'partial', 'UI exists but functionality needs testing');
        } else {
          logFeature({ name: 'Group Chats' }, 'not_working', 'Group chat creation not available');
        }
      } else {
        logFeature({ name: 'Group Chats' }, 'not_working', 'New chat button not found');
      }
    } catch (e) {
      logFeature({ name: 'Group Chats' }, 'not_working', e.message);
    }
    
    // Test 7: Message Reactions
    console.log('\n7. Message Reactions');
    try {
      await page1.type('#message-input', 'React to this!', { delay: 30 });
      await page1.keyboard.press('Enter');
      await delay(2000);
      
      const msg = await page2.$('.message.received');
      if (msg) {
        await msg.click({ clickCount: 2 });
        await delay(1500);
        const reactionPicker = await page2.$('.reaction-btn, .reactions-picker');
        if (reactionPicker) {
          await page2.$('.reaction-btn')?.click();
          await delay(2000);
          const reactions = await page2.$$eval('.reaction-badge', els => els.length);
          if (reactions > 0) {
            logFeature({ name: 'Message Reactions' }, 'working', `${reactions} reactions displayed`);
          } else {
            logFeature({ name: 'Message Reactions' }, 'partial', 'Picker works but reactions not displaying');
          }
        } else {
          logFeature({ name: 'Message Reactions' }, 'partial', 'Reaction picker not appearing');
        }
      } else {
        logFeature({ name: 'Message Reactions' }, 'not_working', 'No messages to react to');
      }
    } catch (e) {
      logFeature({ name: 'Message Reactions' }, 'not_working', e.message);
    }
    
    // Test 8: Message Editing
    console.log('\n8. Message Editing');
    try {
      await page1.type('#message-input', 'Edit this message', { delay: 30 });
      await page1.keyboard.press('Enter');
      await delay(2000);
      
      const messages = await page1.$$('.message.sent');
      if (messages.length > 0) {
        await messages[messages.length - 1].click({ button: 'right' });
        await delay(1500);
        
        const items = await page1.$$('.context-menu-item');
        let editBtn = null;
        for (const item of items) {
          const text = await page1.evaluate(el => el.textContent, item);
          if (text && text.includes('Edit')) {
            editBtn = item;
            break;
          }
        }
        
        if (editBtn) {
          await editBtn.click();
          await delay(2000);
          const editInput = await page1.$('.message-edit-input input');
          if (editInput) {
            logFeature({ name: 'Message Editing' }, 'working', 'Edit functionality available');
          } else {
            logFeature({ name: 'Message Editing' }, 'partial', 'Edit button works but input not appearing');
          }
        } else {
          logFeature({ name: 'Message Editing' }, 'not_working', 'Edit button not found in context menu');
        }
      } else {
        logFeature({ name: 'Message Editing' }, 'not_working', 'No messages found');
      }
    } catch (e) {
      logFeature({ name: 'Message Editing' }, 'not_working', e.message);
    }
    
    // Test 9: Message Deletion
    console.log('\n9. Message Deletion');
    try {
      await page1.type('#message-input', 'Delete this', { delay: 30 });
      await page1.keyboard.press('Enter');
      await delay(2000);
      
      const messages = await page1.$$('.message.sent');
      if (messages.length > 0) {
        await messages[messages.length - 1].click({ button: 'right' });
        await delay(1500);
        
        const items = await page1.$$('.context-menu-item');
        let deleteBtn = null;
        for (const item of items) {
          const text = await page1.evaluate(el => el.textContent, item);
          if (text && text.includes('Delete')) {
            deleteBtn = item;
            break;
          }
        }
        
        if (deleteBtn) {
          logFeature({ name: 'Message Deletion' }, 'working', 'Delete functionality available');
        } else {
          logFeature({ name: 'Message Deletion' }, 'not_working', 'Delete option not found');
        }
      } else {
        logFeature({ name: 'Message Deletion' }, 'not_working', 'No messages found');
      }
    } catch (e) {
      logFeature({ name: 'Message Deletion' }, 'not_working', e.message);
    }
    
    // Test 10: Message Forwarding
    console.log('\n10. Message Forwarding');
    try {
      const msg = await page1.$('.message');
      if (msg) {
        await msg.click({ button: 'right' });
        await delay(1500);
        
        const items = await page1.$$('.context-menu-item');
        let forwardBtn = null;
        for (const item of items) {
          const text = await page1.evaluate(el => el.textContent, item);
          if (text && text.includes('Forward')) {
            forwardBtn = item;
            break;
          }
        }
        
        if (forwardBtn) {
          logFeature({ name: 'Message Forwarding' }, 'working', 'Forward option available');
        } else {
          logFeature({ name: 'Message Forwarding' }, 'not_working', 'Forward option not in context menu');
        }
      } else {
        logFeature({ name: 'Message Forwarding' }, 'not_working', 'No messages to forward');
      }
    } catch (e) {
      logFeature({ name: 'Message Forwarding' }, 'not_working', e.message);
    }
    
    // Test 11: Message Pinning
    console.log('\n11. Message Pinning');
    try {
      const msg = await page1.$('.message');
      if (msg) {
        await msg.click({ button: 'right' });
        await delay(1500);
        
        const items = await page1.$$('.context-menu-item');
        let pinBtn = null;
        for (const item of items) {
          const text = await page1.evaluate(el => el.textContent, item);
          if (text && text.includes('Pin')) {
            pinBtn = item;
            break;
          }
        }
        
        const pinnedMessages = await page1.$$eval('.message.pinned, [class*="pinned"]', els => els.length);
        
        if (pinBtn || pinnedMessages > 0) {
          logFeature({ name: 'Message Pinning' }, 'working', 'Pin functionality available');
        } else {
          logFeature({ name: 'Message Pinning' }, 'not_working', 'Pin option not found');
        }
      } else {
        logFeature({ name: 'Message Pinning' }, 'not_working', 'No messages to pin');
      }
    } catch (e) {
      logFeature({ name: 'Message Pinning' }, 'not_working', e.message);
    }
    
    // Test 12: Message Search
    console.log('\n12. Message Search');
    try {
      const searchInput = await page1.$('.search-input, input[placeholder*="Search"], input[placeholder*="search"]');
      if (searchInput) {
        await searchInput.click();
        await page1.type('.search-input', 'test', { delay: 30 });
        await delay(1000);
        
        const searchResults = await page1.$$eval('.search-result, .message', els => els.length);
        logFeature({ name: 'Message Search' }, 'partial', `Search input exists (${searchResults} results)`);
      } else {
        logFeature({ name: 'Message Search' }, 'not_working', 'Search input not found');
      }
    } catch (e) {
      logFeature({ name: 'Message Search' }, 'not_working', e.message);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 FEATURE TEST SUMMARY');
    console.log('='.repeat(60));
    
    const working = testResults.filter(r => r.status === 'working').length;
    const partial = testResults.filter(r => r.status === 'partial').length;
    const notWorking = testResults.filter(r => r.status === 'not_working').length;
    
    console.log(`✅ Working: ${working}`);
    console.log(`⚠️  Partial: ${partial}`);
    console.log(`❌ Not Working: ${notWorking}`);
    console.log(`\n📈 Overall: ${((working / testResults.length) * 100).toFixed(1)}% fully functional`);
    
    console.log('\n📋 Detailed Results:');
    testResults.forEach(result => {
      const icon = result.status === 'working' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.feature.name}: ${result.status.toUpperCase()}${result.details ? ` - ${result.details}` : ''}`);
    });
    
    await delay(3000);
    return { working, partial, notWorking };
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    return { working: 0, partial: 0, notWorking: testResults.length };
  } finally {
    await browser.close();
  }
}

runFeatureTests()
  .then(results => {
    console.log('\n✅ Testing complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


