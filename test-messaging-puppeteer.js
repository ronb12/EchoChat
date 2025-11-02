const puppeteer = require('puppeteer');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUsers: [
    { displayName: 'Test User 1', email: 'testuser1@echochat.com', uid: 'test-user-1' },
    { displayName: 'Test User 2', email: 'testuser2@echochat.com', uid: 'test-user-2' }
  ],
  messages: [
    { from: 0, text: 'Hello from Test User 1! 👋' },
    { from: 1, text: 'Hi Test User 1! How are you?' },
    { from: 0, text: 'I am doing great! Testing the messaging feature.' },
    { from: 1, text: 'Perfect! The messaging system is working correctly! ✅' }
  ],
  timeout: 30000
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch (error) {
    return false;
  }
}

async function loginUser(page, userIndex) {
  const user = TEST_CONFIG.testUsers[userIndex];
  console.log(`\n🔐 Logging in as ${user.displayName}...`);
  
  try {
    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });
    await delay(2000); // Give React time to render
    
    // Click login button on landing page using data-testid
    console.log('  → Looking for login button...');
    try {
      await page.waitForSelector('[data-testid="get-started-btn"]', { timeout: 10000, visible: true });
      const loginButton = await page.$('[data-testid="get-started-btn"]');
      if (loginButton) {
        console.log('  → Clicking "Get Started" button...');
        await loginButton.click();
        await delay(3000); // Wait for modal to open
      } else {
        throw new Error('Login button element not found');
      }
    } catch (err) {
      console.log('  → Trying alternative: clicking first primary button...');
      const primaryButtons = await page.$$('.btn-primary');
      if (primaryButtons.length > 0) {
        await primaryButtons[0].click();
        await delay(3000);
      } else {
        // Try clicking any button with btn-primary class or first button
        const anyButton = await page.$('button.btn-primary, button');
        if (anyButton) {
          await anyButton.click();
          await delay(3000);
        } else {
          throw new Error('Could not find any login button');
        }
      }
    }
    
    // Wait for login modal to appear - try multiple selectors and wait longer
    console.log('  → Waiting for login modal...');
    
    // Wait a bit for React to update
    await delay(2000);
    
    // Try to find modal with multiple attempts
    let modal = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      await delay(1000);
      modal = await page.$('.modal.active, .modal, [class*="modal"]');
      if (modal) {
        console.log(`  → Modal found! (attempt ${attempt + 1})`);
        break;
      }
      console.log(`  → Attempt ${attempt + 1}/5: Modal not found yet...`);
    }
    
    if (!modal) {
      // Take screenshot for debugging
      await page.screenshot({ path: `debug-modal-missing-${userIndex}.png`, fullPage: true });
      console.log('  → Debug screenshot saved');
      
      // Check what buttons exist on the page
      const buttonCount = await page.$$('button').then(buttons => buttons.length);
      console.log(`  → Found ${buttonCount} buttons on page`);
      
      throw new Error('Login modal did not appear after clicking login button');
    }
    
    await delay(1000);
    
    // Find quick login button using data-testid
    console.log(`  → Looking for test user button (index ${userIndex})...`);
    const testUserButtonId = `test-user-${userIndex + 1}-btn`;
    
    // Wait for the button to be available
    await delay(1000);
    const userButton = await page.$(`[data-testid="${testUserButtonId}"]`);
    
    if (userButton) {
      console.log(`  → Clicking test user button for ${user.displayName}...`);
      await userButton.click();
      await delay(5000);
    } else {
      // Fallback: find all btn-secondary buttons and click by index
      console.log('  → Fallback: trying to find buttons by class...');
      await delay(1000);
      const allButtons = await page.$$('button.btn-secondary');
      console.log(`  → Found ${allButtons.length} secondary buttons`);
      
      if (allButtons.length > userIndex) {
        console.log(`  → Clicking button at index ${userIndex}...`);
        await allButtons[userIndex].click();
        await delay(5000);
      } else {
        // Last resort: try finding buttons with "Test User" text
        const buttons = await page.$$('button');
        console.log(`  → Found ${buttons.length} total buttons, looking for test user buttons...`);
        
        // We can't use evaluate on buttons (causes timeout), so just try clicking first few buttons
        if (buttons.length > userIndex + 2) { // +2 to account for close button and other buttons
          // Click the button that should be the test user button (skip first few which might be modal close, etc)
          const buttonToClick = buttons[userIndex + 1]; // +1 to skip modal close button
          await buttonToClick.click();
          await delay(5000);
        } else {
          throw new Error(`Not enough buttons found. Expected at least ${userIndex + 3}, found ${buttons.length}`);
        }
      }
    }
    
    // Verify login successful - wait longer for React to update
    console.log('  → Verifying login succeeded...');
    await delay(5000); // Give React time to update state and re-render
    
    // Check multiple times for app content
    let loggedIn = false;
    for (let i = 0; i < 5; i++) {
      await delay(2000);
      
      // Check for various indicators of logged-in state
      const chatInput = await page.$('#message-input');
      const appHeader = await page.$('.app-header');
      const welcomeScreen = await page.$('.welcome-screen');
      const chatArea = await page.$('.chat-area');
      const mainContent = await page.$('.main-content');
      const sidebar = await page.$('.sidebar');
      const modalVisible = await page.$('.modal.active');
      
      // If modal is gone and we see any app content, we're logged in
      if (!modalVisible && (chatInput || appHeader || welcomeScreen || chatArea || mainContent || sidebar)) {
        console.log(`✅ Successfully logged in as ${user.displayName} (attempt ${i + 1})`);
        loggedIn = true;
        break;
      }
      
      console.log(`  → Attempt ${i + 1}/5: Still waiting for login to complete...`);
    }
    
    if (!loggedIn) {
      // Final check with screenshot
      await page.screenshot({ path: `test-login-failed-${userIndex}.png`, fullPage: true });
      throw new Error(`Login verification failed for ${user.displayName} after multiple attempts`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error during login for ${user.displayName}:`, error.message);
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: `test-login-error-${userIndex}.png`, fullPage: true });
      console.log(`  → Screenshot saved: test-login-error-${userIndex}.png`);
    } catch (e) {
      // Ignore screenshot errors
    }
    throw error;
  }
}

async function sendMessage(page, messageText, userIndex) {
  const user = TEST_CONFIG.testUsers[userIndex];
  console.log(`\n💬 ${user.displayName} sending: "${messageText}"`);
  
  // Wait for message input
  const inputSelector = '#message-input';
  await waitForElement(page, inputSelector, 5000);
  
  // Type message
  await page.type(inputSelector, messageText, { delay: 50 });
  await delay(300);
  
  // Press Enter to send
  await page.keyboard.press('Enter');
  await delay(1000);
  
  console.log(`✅ Message sent by ${user.displayName}`);
}

async function verifyMessage(page, messageText, senderIndex, isOwnMessage) {
  const user = TEST_CONFIG.testUsers[senderIndex];
  console.log(`\n🔍 Verifying message "${messageText}" from ${user.displayName}...`);
  
  // Wait a bit for message to appear
  await delay(1500);
  
  // Get all messages
  const messages = await page.$$eval('.message', (elements) => {
    return elements.map(el => {
      const content = el.querySelector('.message-text, .message-content');
      const text = content ? content.textContent.trim() : '';
      const isSent = el.classList.contains('sent');
      const sender = el.querySelector('.message-sender');
      const senderName = sender ? sender.textContent.trim() : '';
      return { text, isSent, senderName };
    });
  });
  
  // Find the message
  const foundMessage = messages.find(msg => 
    msg.text.includes(messageText) || msg.text === messageText
  );
  
  if (!foundMessage) {
    console.error(`❌ Message not found: "${messageText}"`);
    console.log('Available messages:', messages.map(m => m.text));
    return false;
  }
  
  // Verify message position (sent messages should be on right, received on left)
  if (isOwnMessage && !foundMessage.isSent) {
    console.error(`❌ Own message should be on right (sent), but it's on left`);
    return false;
  }
  
  if (!isOwnMessage && foundMessage.isSent) {
    console.error(`❌ Received message should be on left, but it's on right (sent)`);
    return false;
  }
  
  console.log(`✅ Message verified - correct position and text`);
  return true;
}

async function runMessagingTest() {
  console.log('🚀 Starting Puppeteer Messaging Test\n');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  // Set default timeout for all page operations
  const setPageTimeout = (page) => {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  };

  try {
    // Create two pages (simulating two users)
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();
    
    // Set timeouts
    setPageTimeout(page1);
    setPageTimeout(page2);
    
    // Navigate both pages to the app
    console.log(`\n📱 Opening ${TEST_CONFIG.baseUrl} in two browser contexts...`);
    await Promise.all([
      page1.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' }),
      page2.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' })
    ]);
    
    await delay(2000);
    
    // Login both users sequentially to avoid conflicts
    await loginUser(page1, 0); // Test User 1
    await delay(1000);
    await loginUser(page2, 1);  // Test User 2
    await delay(1000);
    
    // Wait for chat area to load
    await Promise.all([
      waitForElement(page1, '#message-input', 5000),
      waitForElement(page2, '#message-input', 5000)
    ]);
    
    console.log('\n✅ Both users logged in successfully\n');
    console.log('='.repeat(60));
    
    // Send messages back and forth
    let allTestsPassed = true;
    
    for (let i = 0; i < TEST_CONFIG.messages.length; i++) {
      const msg = TEST_CONFIG.messages[i];
      const senderPage = msg.from === 0 ? page1 : page2;
      const receiverPage = msg.from === 0 ? page2 : page1;
      const senderIndex = msg.from;
      const receiverIndex = msg.from === 0 ? 1 : 0;
      
      // Send message
      await sendMessage(senderPage, msg.text, senderIndex);
      
      // Verify message appears in sender's view (own message)
      const ownMessageVerified = await verifyMessage(
        senderPage, 
        msg.text, 
        senderIndex, 
        true
      );
      
      if (!ownMessageVerified) {
        allTestsPassed = false;
      }
      
      // Wait a bit for cross-tab sync
      await delay(1000);
      
      // Verify message appears in receiver's view (received message)
      const receivedMessageVerified = await verifyMessage(
        receiverPage, 
        msg.text, 
        senderIndex, 
        false
      );
      
      if (!receivedMessageVerified) {
        allTestsPassed = false;
      }
      
      // Add delay between messages
      await delay(1000);
    }
    
    // Final verification - check total message count
    console.log('\n📊 Final Message Count Check...');
    const page1Messages = await page1.$$eval('.message', els => els.length);
    const page2Messages = await page2.$$eval('.message', els => els.length);
    
    console.log(`Page 1 (User 1) sees ${page1Messages} messages`);
    console.log(`Page 2 (User 2) sees ${page2Messages} messages`);
    
    if (page1Messages === TEST_CONFIG.messages.length && 
        page2Messages === TEST_CONFIG.messages.length) {
      console.log('✅ Both users see all messages correctly!');
    } else {
      console.error(`❌ Message count mismatch! Expected ${TEST_CONFIG.messages.length} messages`);
      allTestsPassed = false;
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED! Messaging system is working correctly.');
    } else {
      console.log('❌ SOME TESTS FAILED! Check the errors above.');
    }
    console.log('='.repeat(60) + '\n');
    
    // Keep browser open for a few seconds to see the results
    await delay(3000);
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  runMessagingTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMessagingTest };

