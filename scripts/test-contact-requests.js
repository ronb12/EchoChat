/**
 * Test Contact Request Feature
 * Tests sending and receiving contact requests between test users
 */

const puppeteer = require('puppeteer');

// Load passwords from environment variables for security
// Set these in .env file: TEST_USER1_PASSWORD and TEST_USER2_PASSWORD
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const TEST_USERS = {
  user1: {
    email: 'ronellbradley@bradleyvs.com',
    password: process.env.TEST_USER1_PASSWORD || process.env.TEST_PASSWORD || '',
    displayName: 'Test User 1'
  },
  user2: {
    email: 'ronellbradley@gmail.com',
    password: process.env.TEST_USER2_PASSWORD || process.env.TEST_PASSWORD || '',
    displayName: 'Test User 2'
  }
};

// Validate passwords are set
if (!TEST_USERS.user1.password || !TEST_USERS.user2.password) {
  console.error('❌ ERROR: Test passwords not configured!');
  console.error('Please set TEST_USER1_PASSWORD and TEST_USER2_PASSWORD in .env file');
  console.error('Or set TEST_PASSWORD for both users');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

async function findFrontendServer() {
  const ports = [3002, 5173, 3000];
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok) {
        return port;
      }
    } catch (error) {
      // Continue to next port
    }
  }
  return null;
}

async function login(page, email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);
  
  // Wait for login modal or check if already logged in
  const loginButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    return buttons.find(btn => 
      btn.textContent?.includes('Log In') || 
      btn.textContent?.includes('Sign In') ||
      btn.getAttribute('data-testid') === 'login-button'
    );
  });

  if (loginButton && loginButton.asElement()) {
    await loginButton.asElement().click();
    await sleep(2000);
  }

  // Check if already logged in - more thorough check
  const isLoggedIn = await page.evaluate(() => {
    // Check for main app elements
    const hasAppElements = !!(
      document.querySelector('.chat-area') ||
      document.querySelector('.sidebar') ||
      document.querySelector('.app-header') ||
      document.querySelector('[data-testid="settings-button"]')
    );
    
    // Check that login modal is NOT visible
    const loginModal = document.querySelector('.login-modal, #login-modal');
    const loginModalVisible = loginModal && loginModal.offsetParent !== null;
    
    // Check for user avatar or profile
    const hasUserProfile = !!(
      document.querySelector('.user-avatar') ||
      document.querySelector('[class*="avatar"]')
    );
    
    return hasAppElements && !loginModalVisible && hasUserProfile;
  });

  if (isLoggedIn) {
    console.log('✅ Already logged in');
    await sleep(1000); // Wait for app to fully load
    return true;
  }
  
  console.log('⚠️ Not logged in, proceeding with login...');

  // Wait for login modal/form to appear
  await sleep(2000);

  // Fill login form - try multiple selectors
  const emailInput = await page.evaluateHandle(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="email"], input[type="text"]'));
    return inputs.find(input => {
      const placeholder = (input.placeholder || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      return placeholder.includes('email') ||
             id.includes('email') ||
             name.includes('email') ||
             input.type === 'email';
    });
  });

  if (emailInput && emailInput.asElement()) {
    await emailInput.asElement().click();
    await sleep(300);
    await emailInput.asElement().type(email, { delay: 30 });
    console.log(`✅ Filled email: ${email}`);
  } else {
    console.log('⚠️ Could not find email input');
    await page.screenshot({ path: 'login-form-debug.png' });
    return false;
  }

  await sleep(500);

  const passwordInput = await page.evaluateHandle(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
    return inputs[0];
  });

  if (passwordInput && passwordInput.asElement()) {
    await passwordInput.asElement().click();
    await sleep(300);
    await passwordInput.asElement().type(password, { delay: 30 });
    console.log('✅ Filled password');
  } else {
    console.log('⚠️ Could not find password input');
    return false;
  }

  await sleep(500);

  // Click login button - try multiple selectors
  const submitButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button[type="submit"], button'));
    return buttons.find(btn => {
      const text = (btn.textContent || '').toLowerCase();
      return text.includes('log in') ||
             text.includes('sign in') ||
             text.includes('login') ||
             btn.type === 'submit';
    });
  });

  if (submitButton && submitButton.asElement()) {
    await submitButton.asElement().click();
    console.log('✅ Clicked login button');
    await sleep(3000);
  } else {
    console.log('⚠️ Could not find login button');
    // Try pressing Enter
    await page.keyboard.press('Enter');
    await sleep(3000);
  }

  // Check if login successful - wait and check multiple times
  await sleep(3000);
  
  let loggedIn = false;
  for (let i = 0; i < 3; i++) {
    loggedIn = await page.evaluate(() => {
      const hasAppElements = !!(
        document.querySelector('.chat-area') ||
        document.querySelector('.sidebar') ||
        document.querySelector('.app-header')
      );
      
      const loginModal = document.querySelector('.login-modal, #login-modal');
      const loginModalVisible = loginModal && loginModal.offsetParent !== null;
      
      return hasAppElements && !loginModalVisible;
    });
    
    if (loggedIn) break;
    await sleep(2000);
  }

  if (loggedIn) {
    console.log('✅ Login successful');
    await sleep(2000); // Wait for app to fully load
    return true;
  }

  console.log('⚠️ Login may have failed - checking...');
  // Take screenshot for debugging
  await page.screenshot({ path: 'login-debug.png' });
  return false;
}

async function sendContactRequest(page, recipientEmail) {
  console.log(`\n📤 Sending contact request to ${recipientEmail}...`);

  // First, verify we're logged in and in the app
  const inApp = await page.evaluate(() => {
    return !!(
      document.querySelector('.chat-area') ||
      document.querySelector('.sidebar') ||
      document.querySelector('.app-header')
    );
  });

  if (!inApp) {
    console.log('❌ Not in app - cannot send contact request');
    return false;
  }

  console.log('✅ Confirmed in app');

  // Open new chat modal - try multiple methods
  let modalOpened = false;
  
  // Method 1: Try keyboard shortcut first (most reliable)
  try {
    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    await sleep(2000);
    modalOpened = true;
    console.log('✅ Used keyboard shortcut (Cmd+K)');
  } catch (error) {
    console.log('⚠️ Keyboard shortcut failed, trying button...');
  }

  // Method 2: Try clicking New Chat button
  if (!modalOpened) {
    const newChatButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => 
        btn.textContent?.includes('New Chat') ||
        btn.textContent?.includes('New Message') ||
        btn.getAttribute('data-testid') === 'new-chat-button' ||
        btn.className?.includes('new-chat')
      );
    });

    if (newChatButton && newChatButton.asElement()) {
      await newChatButton.asElement().click();
      await sleep(2000);
      modalOpened = true;
      console.log('✅ Clicked New Chat button');
    }
  }

  // Wait for modal to appear
  await sleep(2000);

  // Check if modal is open - wait a bit more
  await sleep(1000);
  
  const isModalOpen = await page.evaluate(() => {
    return !!(
      document.querySelector('.modal.active') ||
      document.querySelector('#new-chat-modal') ||
      document.querySelector('[class*="new-chat-modal"]') ||
      document.querySelector('[id*="new-chat"]')
    );
  });

  if (!isModalOpen) {
    console.log('⚠️ New chat modal did not open - trying to find it...');
    // Try to find any modal
    const anyModal = await page.evaluate(() => {
      const modals = document.querySelectorAll('.modal, [class*="modal"]');
      return Array.from(modals).map(m => ({
        className: m.className,
        id: m.id,
        visible: m.offsetParent !== null
      }));
    });
    console.log('Found modals:', JSON.stringify(anyModal, null, 2));
    return false;
  }

  console.log('✅ New chat modal opened');

  // Search for user - find search input
  const searchInput = await page.evaluateHandle(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"]'));
    return inputs.find(input => {
      const placeholder = (input.placeholder || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      return placeholder.includes('search') ||
             placeholder.includes('email') ||
             placeholder.includes('username') ||
             placeholder.includes('find') ||
             id.includes('search') ||
             id.includes('user');
    });
  });

  if (searchInput && searchInput.asElement()) {
    await searchInput.asElement().click();
    await sleep(500);
    await searchInput.asElement().type(recipientEmail, { delay: 50 });
    console.log(`✅ Typed email: ${recipientEmail}`);
    await sleep(1000);

    // Click search button if exists
    const searchButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('search') ||
               text.includes('find') ||
               btn.getAttribute('data-testid')?.includes('search');
      });
    });

    if (searchButton && searchButton.asElement()) {
      await searchButton.asElement().click();
      console.log('✅ Clicked search button');
      await sleep(3000); // Wait for search results
    } else {
      // Wait for search to happen automatically or press Enter
      await page.keyboard.press('Enter');
      await sleep(3000);
    }
  } else {
    console.log('⚠️ Could not find search input');
    return false;
  }

  // Wait for user to appear in results
  await sleep(3000);

  // Check if user was found
  const userFound = await page.evaluate(() => {
    const userElements = document.querySelectorAll('.chat-item, .user-item, [class*="user"]');
    return userElements.length > 0;
  });

  if (!userFound) {
    console.log('⚠️ User not found in search results');
    // Debug: Check what's in the modal
    const modalContent = await page.evaluate(() => {
      const modal = document.querySelector('.modal.active, #new-chat-modal');
      if (!modal) return 'No modal found';
      return {
        html: modal.innerHTML.substring(0, 500),
        buttons: Array.from(modal.querySelectorAll('button')).map(b => b.textContent?.trim())
      };
    });
    console.log('Modal content:', JSON.stringify(modalContent, null, 2));
    return false;
  }

  console.log('✅ User found in search results');

  // Click "Send Contact Request" button - try multiple selectors
  const sendRequestButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => {
      const text = (btn.textContent || '').toLowerCase().trim();
      return text.includes('send contact request') ||
             (text.includes('send') && text.includes('contact')) ||
             text.includes('📤 send contact') ||
             btn.getAttribute('data-testid')?.includes('send-request');
    });
  });

  if (sendRequestButton && sendRequestButton.asElement()) {
    await sendRequestButton.asElement().click();
    await sleep(2000);
    console.log('✅ Contact request sent');
    return true;
  }

  // Debug: Check what buttons are available
  const availableButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(btn => ({
      text: btn.textContent?.trim(),
      className: btn.className,
      id: btn.id,
      dataTestId: btn.getAttribute('data-testid')
    })).filter(btn => btn.text);
  });

  console.log('⚠️ Could not find "Send Contact Request" button');
  console.log('Available buttons:', JSON.stringify(availableButtons, null, 2));
  return false;
}

async function checkPendingRequests(page) {
  console.log(`\n📬 Checking for pending contact requests...`);

  // Click Requests button in header
  const requestsButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent?.includes('Requests') ||
      btn.textContent?.includes('📬')
    );
  });

  if (requestsButton && requestsButton.asElement()) {
    await requestsButton.asElement().click();
    await sleep(2000);
  }

  // Check if modal opened and has requests
  const hasRequests = await page.evaluate(() => {
    const modal = document.querySelector('.contact-request-modal, #contact-request-modal');
    if (!modal) return false;

    const requestItems = modal.querySelectorAll('.chat-item, .user-item, [class*="request"]');
    return requestItems.length > 0;
  });

  if (hasRequests) {
    console.log('✅ Found pending contact requests');
    return true;
  }

  console.log('⚠️ No pending requests found');
  return false;
}

async function acceptContactRequest(page) {
  console.log(`\n✅ Accepting contact request...`);

  const acceptButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent?.includes('Accept') ||
      btn.textContent?.includes('✅')
    );
  });

  if (acceptButton && acceptButton.asElement()) {
    await acceptButton.asElement().click();
    await sleep(2000);
    console.log('✅ Contact request accepted');
    return true;
  }

  console.log('⚠️ Could not find Accept button');
  return false;
}

async function runTest() {
  console.log('🧪 Starting Contact Request Feature Test...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const port = await findFrontendServer();
  if (!port) {
    console.error('❌ No frontend server found. Please start the frontend server.');
    process.exit(1);
  }

  console.log(`✅ Found frontend server on port ${port}`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('\n📋 Test Steps:');
    console.log('1. Login as User 1');
    console.log('2. Send contact request to User 2');
    console.log('3. Logout');
    console.log('4. Login as User 2');
    console.log('5. Check for pending requests');
    console.log('6. Accept contact request');

    // Step 1: Login as User 1
    const loggedIn1 = await login(page, TEST_USERS.user1.email, TEST_USERS.user1.password);
    if (!loggedIn1) {
      console.error('❌ Failed to login as User 1');
      await browser.close();
      process.exit(1);
    }

    await sleep(2000);

    // Step 2: Send contact request
    const requestSent = await sendContactRequest(page, TEST_USERS.user2.email);
    if (!requestSent) {
      console.error('❌ Failed to send contact request');
    }

    await sleep(2000);

    // Step 3: Logout
    console.log('\n🚪 Logging out...');
    const avatarMenu = await page.evaluateHandle(() => {
      const avatars = Array.from(document.querySelectorAll('.user-avatar, [class*="avatar"]'));
      return avatars[0];
    });

    if (avatarMenu && avatarMenu.asElement()) {
      await avatarMenu.asElement().click();
      await sleep(1000);

      const logoutButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent?.includes('Sign Out') ||
          btn.textContent?.includes('Logout') ||
          btn.textContent?.includes('Log Out')
        );
      });

      if (logoutButton && logoutButton.asElement()) {
        await logoutButton.asElement().click();
        await sleep(2000);
      }
    }

    // Step 4: Login as User 2
    const loggedIn2 = await login(page, TEST_USERS.user2.email, TEST_USERS.user2.password);
    if (!loggedIn2) {
      console.error('❌ Failed to login as User 2');
      await browser.close();
      process.exit(1);
    }

    await sleep(2000);

    // Step 5: Check for pending requests
    const hasRequests = await checkPendingRequests(page);
    if (!hasRequests) {
      console.error('❌ No pending requests found - request may not have been created');
    }

    await sleep(2000);

    // Step 6: Accept request
    if (hasRequests) {
      await acceptContactRequest(page);
    }

    await sleep(2000);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Contact Request Test Complete!');
    console.log('\n📊 Test Results:');
    console.log(`   Login User 1: ${loggedIn1 ? '✅' : '❌'}`);
    console.log(`   Send Request: ${requestSent ? '✅' : '❌'}`);
    console.log(`   Login User 2: ${loggedIn2 ? '✅' : '❌'}`);
    console.log(`   Found Requests: ${hasRequests ? '✅' : '❌'}`);

    await sleep(5000);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    try {
      const page = await browser.pages().then(pages => pages[0]);
      if (page) {
        await page.screenshot({ path: 'contact-request-test-error.png' });
      }
    } catch (screenshotError) {
      console.error('Could not take screenshot:', screenshotError);
    }
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);

