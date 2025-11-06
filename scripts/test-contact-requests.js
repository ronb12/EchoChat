/**
 * Test Contact Request Feature
 * Tests sending and receiving contact requests between test users
 */

const puppeteer = require('puppeteer');

const TEST_USERS = {
  user1: {
    email: 'ronellbradley@bradleyvs.com',
    password: 'test123456', // Update with actual password
    displayName: 'Test User 1'
  },
  user2: {
    email: 'ronellbradley@gmail.com',
    password: 'test123456', // Update with actual password
    displayName: 'Test User 2'
  }
};

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

  // Check if already logged in
  const isLoggedIn = await page.evaluate(() => {
    return !!(
      document.querySelector('.chat-area') ||
      document.querySelector('.sidebar') ||
      document.querySelector('[data-testid="settings-button"]') ||
      !document.querySelector('.login-modal') ||
      !document.querySelector('#login-modal')
    );
  });

  if (isLoggedIn) {
    console.log('✅ Already logged in');
    return true;
  }

  // Fill login form
  const emailInput = await page.evaluateHandle(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="email"], input[type="text"]'));
    return inputs.find(input => 
      input.placeholder?.toLowerCase().includes('email') ||
      input.id?.includes('email') ||
      input.name?.includes('email')
    );
  });

  if (emailInput && emailInput.asElement()) {
    await emailInput.asElement().type(email, { delay: 50 });
  }

  await sleep(500);

  const passwordInput = await page.evaluateHandle(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
    return inputs[0];
  });

  if (passwordInput && passwordInput.asElement()) {
    await passwordInput.asElement().type(password, { delay: 50 });
  }

  await sleep(500);

  // Click login button
  const submitButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button[type="submit"], button'));
    return buttons.find(btn => 
      btn.textContent?.includes('Log In') ||
      btn.textContent?.includes('Sign In') ||
      btn.textContent?.includes('Login')
    );
  });

  if (submitButton && submitButton.asElement()) {
    await submitButton.asElement().click();
    await sleep(3000);
  }

  // Check if login successful
  const loggedIn = await page.evaluate(() => {
    return !!(
      document.querySelector('.chat-area') ||
      document.querySelector('.sidebar') ||
      document.querySelector('[data-testid="settings-button"]')
    );
  });

  if (loggedIn) {
    console.log('✅ Login successful');
    return true;
  }

  console.log('⚠️ Login may have failed - checking...');
  return false;
}

async function sendContactRequest(page, recipientEmail) {
  console.log(`\n📤 Sending contact request to ${recipientEmail}...`);

  // Open new chat modal
  const newChatButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    return buttons.find(btn => 
      btn.textContent?.includes('New Chat') ||
      btn.textContent?.includes('New Message') ||
      btn.getAttribute('data-testid') === 'new-chat-button'
    );
  });

  if (newChatButton && newChatButton.asElement()) {
    await newChatButton.asElement().click();
    await sleep(2000);
  } else {
    // Try keyboard shortcut
    await page.keyboard.press('Meta+k');
    await sleep(2000);
  }

  // Search for user
  const searchInput = await page.evaluateHandle(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"]'));
    return inputs.find(input => 
      input.placeholder?.toLowerCase().includes('search') ||
      input.placeholder?.toLowerCase().includes('email') ||
      input.placeholder?.toLowerCase().includes('username')
    );
  });

  if (searchInput && searchInput.asElement()) {
    await searchInput.asElement().type(recipientEmail, { delay: 50 });
    await sleep(1000);

    // Click search button if exists
    const searchButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent?.includes('Search') ||
        btn.textContent?.includes('Find')
      );
    });

    if (searchButton && searchButton.asElement()) {
      await searchButton.asElement().click();
      await sleep(2000);
    }
  }

  // Click "Send Contact Request" button
  const sendRequestButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent?.includes('Send Contact Request') ||
      btn.textContent?.includes('Request') ||
      btn.textContent?.includes('📤')
    );
  });

  if (sendRequestButton && sendRequestButton.asElement()) {
    await sendRequestButton.asElement().click();
    await sleep(2000);
    console.log('✅ Contact request sent');
    return true;
  }

  console.log('⚠️ Could not find "Send Contact Request" button');
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
    await page.screenshot({ path: 'contact-request-test-error.png' });
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);

