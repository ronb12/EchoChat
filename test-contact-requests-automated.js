/**
 * Automated Contact Request Feature Test
 * Tests the complete contact request flow including real-time updates
 * 
 * Usage: node test-contact-requests-automated.js
 * 
 * Requires:
 * - Frontend server running (port 3002, 5173, or 3000)
 * - TEST_USER1_PASSWORD and TEST_USER2_PASSWORD in .env file
 */

const puppeteer = require('puppeteer');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

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

// Validate passwords
if (!TEST_USERS.user1.password || !TEST_USERS.user2.password) {
  console.error('❌ ERROR: Test passwords not configured!');
  console.error('Please set TEST_USER1_PASSWORD and TEST_USER2_PASSWORD in .env file');
  process.exit(1);
}

// Test configuration
const CONFIG = {
  headless: process.env.HEADLESS === 'true' || process.env.HEADLESS === undefined,
  timeout: 30000,
  waitTime: 2000,
  screenshotOnError: true
};

// Utility functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
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

async function takeScreenshot(page, filename) {
  try {
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to take screenshot: ${error.message}`);
  }
}

// Login function
async function login(page, email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);
  
  // Wait for page to fully load
  await sleep(3000);
  
  // Check if already logged in
  const isLoggedIn = await page.evaluate(() => {
    return !!(
      document.querySelector('.chat-area') ||
      document.querySelector('.sidebar') ||
      document.querySelector('.app-header')
    );
  });

  if (isLoggedIn) {
    console.log('✅ Already logged in');
    await sleep(2000);
    return true;
  }

  // Try to find and click LOGIN button specifically (not Sign Up)
  let loginButtonClicked = false;
  
  // Method 1: Try data-testid for login specifically
  try {
    const loginTestIdButton = await page.$('[data-testid="login-button"]');
    if (loginTestIdButton) {
      await loginTestIdButton.click();
      await sleep(2000);
      loginButtonClicked = true;
      console.log('✅ Clicked login button (data-testid="login-button")');
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 2: Try text content - specifically look for "Log In" or "Sign In" (not Sign Up)
  if (!loginButtonClicked) {
    const loginButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => {
        const text = (btn.textContent || '').toLowerCase().trim();
        // Explicitly look for login, not sign up
        return (text.includes('log in') || text.includes('sign in') || text.includes('login')) &&
               !text.includes('sign up') && 
               !text.includes('create account') &&
               !text.includes('register');
      });
    });

    if (loginButton && loginButton.asElement()) {
      await loginButton.asElement().click();
      await sleep(2000);
      loginButtonClicked = true;
      console.log('✅ Clicked login button (text content)');
    }
  }

  // Method 3: Try to find login link/button in modal switcher
  if (!loginButtonClicked) {
    try {
      // Check if there's a modal with tabs/links to switch to login
      const loginLink = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a, button, span'));
        return links.find(link => {
          const text = (link.textContent || '').toLowerCase().trim();
          return (text === 'log in' || text === 'sign in' || text === 'login') &&
                 !text.includes('sign up');
        });
      });

      if (loginLink && loginLink.asElement()) {
        await loginLink.asElement().click();
        await sleep(2000);
        loginButtonClicked = true;
        console.log('✅ Clicked login link/button');
      }
    } catch (e) {
      // Continue
    }
  }

  // Method 4: If modal is open, check if it's already on login tab
  if (!loginButtonClicked) {
    const isLoginModal = await page.evaluate(() => {
      const modal = document.querySelector('.modal.active, .login-modal, #login-modal');
      if (!modal) return false;
      
      // Check if modal has login form (not signup form)
      const hasLoginForm = !!(
        modal.querySelector('input[type="email"]') &&
        modal.querySelector('input[type="password"]') &&
        !modal.textContent.toLowerCase().includes('create account') &&
        !modal.textContent.toLowerCase().includes('sign up')
      );
      
      return hasLoginForm;
    });

    if (isLoginModal) {
      loginButtonClicked = true;
      console.log('✅ Login modal already open');
    }
  }

  // Wait for login modal/form to appear
  await sleep(2000);
  
  // Verify we're on login form, not signup form
  const isOnLoginForm = await page.evaluate(() => {
    const modal = document.querySelector('.modal.active, .login-modal, #login-modal');
    if (!modal) return false;
    
    // Check if it's a login form (has password field and says "Log In" not "Sign Up")
    const modalText = (modal.textContent || '').toLowerCase();
    const isSignUp = modalText.includes('sign up') || 
                     modalText.includes('create account') ||
                     modalText.includes('register');
    
    return !isSignUp && !!modal.querySelector('input[type="password"]');
  });

  if (!isOnLoginForm && !loginButtonClicked) {
    console.log('⚠️ Not on login form - might be on signup form');
    console.log('   Trying to switch to login...');
    
    // Try to find and click a "Log In" link/button to switch tabs
    const switchToLogin = await page.evaluateHandle(() => {
      const elements = Array.from(document.querySelectorAll('a, button, span, div'));
      return elements.find(el => {
        const text = (el.textContent || '').toLowerCase().trim();
        return (text === 'log in' || text === 'sign in') && 
               !text.includes('sign up');
      });
    });

    if (switchToLogin && switchToLogin.asElement()) {
      await switchToLogin.asElement().click();
      await sleep(2000);
      console.log('✅ Switched to login form');
    } else {
      console.log('⚠️ Could not switch to login form');
    }
  }
  
  // Fill email - try multiple methods
  let emailFilled = false;
  
  // Method 1: Try by type
  try {
    const emailInputByType = await page.$('input[type="email"]');
    if (emailInputByType) {
      await emailInputByType.click();
      await sleep(300);
      await emailInputByType.type(email, { delay: 30 });
      emailFilled = true;
      console.log(`✅ Filled email (by type)`);
    }
  } catch (e) {
    // Continue
  }

  // Method 2: Try by placeholder
  if (!emailFilled) {
    const emailInput = await page.evaluateHandle(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="email"], input[type="text"]'));
      return inputs.find(input => {
        const placeholder = (input.placeholder || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        return placeholder.includes('email') || 
               id.includes('email') ||
               input.type === 'email';
      });
    });

    if (emailInput && emailInput.asElement()) {
      await emailInput.asElement().click();
      await sleep(300);
      await emailInput.asElement().type(email, { delay: 30 });
      emailFilled = true;
      console.log(`✅ Filled email (by placeholder/id)`);
    }
  }

  if (!emailFilled) {
    console.log('⚠️ Could not find email input');
    await takeScreenshot(page, 'test-email-input-not-found.png');
    return false;
  }

  await sleep(500);

  // Fill password
  await sleep(500);
  
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.click();
    await sleep(300);
    await passwordInput.type(password, { delay: 30 });
    console.log('✅ Filled password');
  } else {
    console.log('⚠️ Could not find password input');
    await takeScreenshot(page, 'test-password-input-not-found.png');
    return false;
  }

  await sleep(500);

  // Click submit - try multiple methods
  await sleep(500);
  
  let submitted = false;
  
  // Method 1: Try submit button by type
  try {
    const submitByType = await page.$('button[type="submit"]');
    if (submitByType) {
      await submitByType.click();
      await sleep(3000);
      submitted = true;
      console.log('✅ Clicked submit button (by type)');
    }
  } catch (e) {
    // Continue
  }

  // Method 2: Try by text
  if (!submitted) {
    const submitButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = (btn.textContent || '').toLowerCase().trim();
        return text.includes('log in') || 
               text.includes('sign in') ||
               text.includes('login') ||
               btn.type === 'submit';
      });
    });

    if (submitButton && submitButton.asElement()) {
      await submitButton.asElement().click();
      await sleep(3000);
      submitted = true;
      console.log('✅ Clicked submit button (by text)');
    }
  }

  // Method 3: Press Enter
  if (!submitted) {
    await page.keyboard.press('Enter');
    await sleep(3000);
    console.log('✅ Pressed Enter to submit');
  }

  // Verify login - wait longer and check multiple times
  let loggedIn = false;
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    
    // Check if still signing in
    const isSigningIn = await page.evaluate(() => {
      const modal = document.querySelector('.modal.active, .login-modal, #login-modal');
      if (!modal) return false;
      const text = modal.textContent || '';
      return text.includes('Signing In') || text.includes('Loading');
    });
    
    if (isSigningIn && i < 8) {
      console.log(`⏳ Still signing in... (attempt ${i + 1}/10)`);
      continue;
    }
    
    loggedIn = await page.evaluate(() => {
      // Check for app elements
      const hasAppElements = !!(
        document.querySelector('.chat-area') ||
        document.querySelector('.sidebar') ||
        document.querySelector('.app-header') ||
        document.querySelector('.user-avatar')
      );
      
      // Check that login modal is NOT visible
      const loginModal = document.querySelector('.login-modal, #login-modal, .modal.active');
      const modalVisible = loginModal && loginModal.offsetParent !== null;
      
      // Check for error messages
      const hasError = !!document.querySelector('.error, [class*="error"], .notification.error');
      
      return hasAppElements && !modalVisible && !hasError;
    });
    
    if (loggedIn) {
      console.log(`✅ Login successful (attempt ${i + 1})`);
      break;
    }
    console.log(`⏳ Waiting for login... (attempt ${i + 1}/10)`);
  }

  if (loggedIn) {
    await sleep(2000); // Wait for app to fully load
    return true;
  }

  // Check what's on the page for debugging
  const pageState = await page.evaluate(() => {
    return {
      hasAppElements: !!(
        document.querySelector('.chat-area') ||
        document.querySelector('.sidebar') ||
        document.querySelector('.app-header')
      ),
      hasModal: !!document.querySelector('.modal.active'),
      modalText: document.querySelector('.modal.active')?.textContent?.substring(0, 100) || '',
      hasError: !!document.querySelector('.error, [class*="error"]'),
      errorText: document.querySelector('.error, [class*="error"]')?.textContent?.substring(0, 100) || ''
    };
  });
  
  console.log('❌ Login failed');
  console.log('Page state:', JSON.stringify(pageState, null, 2));
  
  if (CONFIG.screenshotOnError) {
    await takeScreenshot(page, 'test-login-failed.png');
  }
  return false;
}

// Send contact request
async function sendContactRequest(page, recipientEmail) {
  console.log(`\n📤 Sending contact request to ${recipientEmail}...`);

  // Open new chat modal - try keyboard shortcut first
  try {
    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    await sleep(2000);
    console.log('✅ Used keyboard shortcut (Cmd+K)');
  } catch (error) {
    // Try button click
    const newChatButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => 
        btn.textContent?.includes('New Chat') ||
        btn.getAttribute('data-testid') === 'new-chat-button'
      );
    });

    if (newChatButton && newChatButton.asElement()) {
      await newChatButton.asElement().click();
      await sleep(2000);
      console.log('✅ Clicked New Chat button');
    }
  }

  // Wait for modal
  await sleep(2000);
  const isModalOpen = await page.evaluate(() => {
    return !!(
      document.querySelector('.modal.active') ||
      document.querySelector('#new-chat-modal')
    );
  });

  if (!isModalOpen) {
    console.log('❌ New chat modal did not open');
    return false;
  }

  console.log('✅ New chat modal opened');

  // Find and fill search input - specifically within the new chat modal
  let searchInput = null;
  
  // Method 1: Try to find by class name within the modal
  try {
    searchInput = await page.$('#new-chat-modal .search-input, .modal.active .search-input');
    if (searchInput) {
      console.log('✅ Found search input by class name');
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 2: Find by placeholder within the modal
  if (!searchInput) {
    searchInput = await page.evaluateHandle(() => {
      const modal = document.querySelector('#new-chat-modal, .modal.active');
      if (!modal) return null;
      
      const inputs = Array.from(modal.querySelectorAll('input[type="text"], input[type="search"], input[type="email"]'));
      return inputs.find(input => {
        const placeholder = (input.placeholder || '').toLowerCase();
        return placeholder.includes('username') ||
               placeholder.includes('email') ||
               placeholder.includes('search') ||
               input.className.includes('search');
      });
    });

    if (searchInput && searchInput.asElement()) {
      console.log('✅ Found search input by placeholder');
    }
  }

  // Method 3: Find first text input in the modal
  if (!searchInput) {
    try {
      searchInput = await page.$('#new-chat-modal input[type="text"], .modal.active input[type="text"]');
      if (searchInput) {
        console.log('✅ Found search input as first text input in modal');
      }
    } catch (e) {
      // Continue
    }
  }

  if (!searchInput) {
    console.log('❌ Could not find search input in new chat modal');
    await takeScreenshot(page, 'test-search-input-not-found.png');
    return false;
  }

  // Clear any existing text and type the email
  await searchInput.click();
  await sleep(300);
  
  // Clear the input first
  await page.keyboard.down('Meta');
  await page.keyboard.press('a');
  await page.keyboard.up('Meta');
  await sleep(100);
  
  await searchInput.type(recipientEmail, { delay: 50 });
  console.log(`✅ Typed email in search input: ${recipientEmail}`);
  await sleep(1000);

  // Click search button or press Enter
  const searchButton = await page.evaluateHandle(() => {
    const modal = document.querySelector('#new-chat-modal, .modal.active');
    if (!modal) return null;
    
    const buttons = Array.from(modal.querySelectorAll('button'));
    return buttons.find(btn => {
      const text = (btn.textContent || '').toLowerCase();
      return text.includes('search') || text.includes('find');
    });
  });

  if (searchButton && searchButton.asElement()) {
    await searchButton.asElement().click();
    await sleep(3000);
    console.log('✅ Clicked search button');
  } else {
    // Press Enter to trigger search
    await page.keyboard.press('Enter');
    await sleep(3000);
    console.log('✅ Pressed Enter to search');
  }

  // Wait for user to appear
  await sleep(3000);

  // Wait for user to appear in results and button to render
  let userFound = false;
  let sendRequestButton = null;
  
  // Wait up to 10 seconds for the button to appear
  for (let i = 0; i < 10; i++) {
    await sleep(1000);
    
    // Check if user was found
    userFound = await page.evaluate(() => {
      const modal = document.querySelector('#new-chat-modal, .modal.active');
      if (!modal) return false;
      
      const userElements = modal.querySelectorAll('.chat-item, .user-item, [class*="user"]');
      return userElements.length > 0;
    });

    if (!userFound) {
      console.log(`⏳ Waiting for user to appear... (attempt ${i + 1}/10)`);
      continue;
    }

    console.log('✅ User found in search results');

    // Look for the "Send Contact Request" button
    sendRequestButton = await page.evaluateHandle(() => {
      const modal = document.querySelector('#new-chat-modal, .modal.active');
      if (!modal) return null;
      
      const buttons = Array.from(modal.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = (btn.textContent || '').toLowerCase().trim();
        return text.includes('send contact request') ||
               (text.includes('send') && text.includes('contact')) ||
               text.includes('📤 send') ||
               (text.includes('📤') && text.includes('contact'));
      });
    });

    if (sendRequestButton && sendRequestButton.asElement()) {
      console.log(`✅ Found "Send Contact Request" button (attempt ${i + 1})`);
      break;
    }
    
    // Check if request is already pending
    const requestPending = await page.evaluate(() => {
      const modal = document.querySelector('#new-chat-modal, .modal.active');
      if (!modal) return false;
      const text = modal.textContent || '';
      return text.includes('Request Pending') || text.includes('⏳');
    });
    
    if (requestPending) {
      console.log('✅ Request already pending (button not shown because request was sent previously)');
      return true; // Consider this a success
    }
    
    console.log(`⏳ Waiting for "Send Contact Request" button to appear... (attempt ${i + 1}/10)`);
  }

  if (!userFound) {
    console.log('❌ User not found in search results');
    return false;
  }

  // Check one more time if request is pending
  const requestPending = await page.evaluate(() => {
    const modal = document.querySelector('#new-chat-modal, .modal.active');
    if (!modal) return false;
    const text = modal.textContent || '';
    return text.includes('Request Pending') || text.includes('⏳');
  });
  
  if (requestPending) {
    console.log('✅ Request already pending');
    return true;
  }

  if (!sendRequestButton || !sendRequestButton.asElement()) {
    // Debug: List all available buttons and check user state
    const debugInfo = await page.evaluate(() => {
      const modal = document.querySelector('#new-chat-modal, .modal.active');
      if (!modal) return { error: 'Modal not found' };
      
      const buttons = Array.from(modal.querySelectorAll('button'));
      const userElements = Array.from(modal.querySelectorAll('.chat-item, .user-item'));
      
      return {
        buttons: buttons.map(btn => ({
          text: btn.textContent?.trim() || '',
          className: btn.className || '',
          disabled: btn.disabled
        })).filter(btn => btn.text),
        userElements: userElements.length,
        modalText: modal.textContent?.substring(0, 200) || ''
      };
    });

    console.log('❌ Could not find "Send Contact Request" button');
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    await takeScreenshot(page, 'test-send-button-not-found.png');
    return false;
  }

  // Click the button
  await sendRequestButton.asElement().click();
  await sleep(3000);
  console.log('✅ Contact request sent');
  
  // Verify success notification
  await sleep(1000);
  const successNotification = await page.evaluate(() => {
    const notifications = Array.from(document.querySelectorAll('.notification, [class*="notification"]'));
    return notifications.some(notif => {
      const text = (notif.textContent || '').toLowerCase();
      return text.includes('sent') || text.includes('success');
    });
  });

  if (successNotification) {
    console.log('✅ Success notification appeared');
  } else {
    console.log('⚠️ No success notification found, but button was clicked');
  }
  
  return true;
}

// Check pending requests count in header
async function getPendingRequestsCount(page) {
  const count = await page.evaluate(() => {
    const requestsButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent?.includes('Requests') || btn.textContent?.includes('📬')
    );
    
    if (requestsButton) {
      const badge = requestsButton.querySelector('span');
      if (badge) {
        const text = badge.textContent.trim();
        const num = parseInt(text);
        return isNaN(num) ? 0 : num;
      }
    }
    return 0;
  });
  
  return count;
}

// Open contact requests modal
async function openContactRequestsModal(page) {
  console.log('\n📬 Opening contact requests modal...');
  
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
    
    // Verify modal opened
    const modalOpen = await page.evaluate(() => {
      return !!(
        document.querySelector('.contact-request-modal') ||
        document.querySelector('#contact-request-modal') ||
        document.querySelector('.modal.active')
      );
    });

    if (modalOpen) {
      console.log('✅ Contact requests modal opened');
      return true;
    }
  }

  console.log('❌ Could not open contact requests modal');
  return false;
}

// Check if pending requests are visible
async function checkPendingRequestsVisible(page) {
  const hasRequests = await page.evaluate(() => {
    const modal = document.querySelector('.contact-request-modal, #contact-request-modal, .modal.active');
    if (!modal) return false;

    const requestItems = modal.querySelectorAll('.chat-item, .user-item, [class*="request"]');
    return requestItems.length > 0;
  });

  if (hasRequests) {
    console.log('✅ Pending requests are visible');
    
    // Get request details
    const requestDetails = await page.evaluate(() => {
      const modal = document.querySelector('.contact-request-modal, #contact-request-modal, .modal.active');
      if (!modal) return [];

      const items = Array.from(modal.querySelectorAll('.chat-item, .user-item'));
      return items.map(item => ({
        name: item.querySelector('.chat-name, [class*="name"]')?.textContent?.trim() || 'Unknown',
        email: item.querySelector('.chat-preview, [class*="email"]')?.textContent?.trim() || ''
      }));
    });

    console.log(`📋 Found ${requestDetails.length} request(s):`);
    requestDetails.forEach((req, index) => {
      console.log(`   ${index + 1}. ${req.name} (${req.email})`);
    });

    return true;
  }

  console.log('⚠️ No pending requests visible');
  return false;
}

// Accept contact request
async function acceptContactRequest(page) {
  console.log('\n✅ Accepting contact request...');

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

  console.log('❌ Could not find Accept button');
  return false;
}

// Logout function
async function logout(page) {
  console.log('\n🚪 Logging out...');
  
  // Try multiple methods to logout
  let loggedOut = false;
  
  // Method 1: Click avatar menu
  const avatarMenu = await page.evaluateHandle(() => {
    const avatars = Array.from(document.querySelectorAll('.user-avatar, [class*="avatar"]'));
    return avatars[0];
  });

  if (avatarMenu && avatarMenu.asElement()) {
    await avatarMenu.asElement().click();
    await sleep(1500);

    const logoutButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = (btn.textContent || '').toLowerCase().trim();
        return text.includes('sign out') ||
               text.includes('logout') ||
               text.includes('log out');
      });
    });

    if (logoutButton && logoutButton.asElement()) {
      await logoutButton.asElement().click();
      await sleep(3000);
      loggedOut = true;
      console.log('✅ Logged out via avatar menu');
    }
  }

  // Method 2: Check if actually logged out
  if (loggedOut) {
    const isLoggedOut = await page.evaluate(() => {
      // Check if login modal is visible or app elements are gone
      const loginModal = document.querySelector('.login-modal, #login-modal');
      const hasAppElements = !!(
        document.querySelector('.chat-area') ||
        document.querySelector('.sidebar') ||
        document.querySelector('.app-header')
      );
      return !hasAppElements || (loginModal && loginModal.offsetParent !== null);
    });

    if (!isLoggedOut) {
      console.log('⚠️ Logout may not have completed, trying alternative method...');
      // Try calling signOut directly via page context
      await page.evaluate(async () => {
        try {
          // Try to access auth and sign out
          if (window.firebase && window.firebase.auth) {
            await window.firebase.auth().signOut();
            return true;
          }
        } catch (e) {
          return false;
        }
      });
      await sleep(2000);
    }
  }

  // Verify logout
  const verifiedLogout = await page.evaluate(() => {
    const hasAppElements = !!(
      document.querySelector('.chat-area') ||
      document.querySelector('.sidebar') ||
      document.querySelector('.app-header')
    );
    return !hasAppElements;
  });

  if (verifiedLogout) {
    console.log('✅ Verified logout successful');
    return true;
  }

  console.log('⚠️ Logout may have failed - user might still be logged in');
  return false;
}

// Main test function
async function runTest() {
  console.log('🧪 Starting Automated Contact Request Feature Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const port = await findFrontendServer();
  if (!port) {
    console.error('❌ No frontend server found. Please start the frontend server.');
    process.exit(1);
  }

  console.log(`✅ Found frontend server on port ${port}`);
  console.log(`📋 Test Configuration:`);
  console.log(`   Headless: ${CONFIG.headless}`);
  console.log(`   User 1: ${TEST_USERS.user1.email}`);
  console.log(`   User 2: ${TEST_USERS.user2.email}\n`);

  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const results = {
    loginUser1: false,
    sendRequest: false,
    logoutUser1: false,
    loginUser2: false,
    checkRequestsCount: false,
    openModal: false,
    requestsVisible: false,
    acceptRequest: false
  };

  try {
    const page = await browser.newPage();
    
    // Capture all console logs, especially those related to contact requests
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      
      // Show important logs
      if (text.includes('📤') || text.includes('📬') || text.includes('✅') || text.includes('❌') ||
          text.includes('toUserId') || text.includes('fromUserId') || text.includes('userId') ||
          text.includes('Query') || text.includes('query') || text.includes('getPendingRequests') ||
          text.includes('subscribeToPendingRequests') || text.includes('MISMATCH')) {
        console.log(`   [Page] ${text}`);
      }
    });

    await page.goto(`http://localhost:${port}`, { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.timeout 
    });

    console.log('\n📋 Test Steps:');
    console.log('1. Login as User 1');
    console.log('2. Send contact request to User 2');
    console.log('3. Logout User 1');
    console.log('4. Login as User 2');
    console.log('5. Check pending requests count (should be > 0)');
    console.log('6. Open contact requests modal');
    console.log('7. Verify requests are visible');
    console.log('8. Accept contact request\n');

    // Step 1: Login as User 1
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.loginUser1 = await login(page, TEST_USERS.user1.email, TEST_USERS.user1.password);
    if (!results.loginUser1) {
      throw new Error('Failed to login as User 1');
    }

    await sleep(2000);

    // Step 2: Send contact request
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.sendRequest = await sendContactRequest(page, TEST_USERS.user2.email);
    if (!results.sendRequest) {
      console.log('⚠️ Failed to send contact request, but continuing test...');
    }

    await sleep(3000); // Wait for request to be saved

    // Step 3: Logout
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.logoutUser1 = await logout(page);
    await sleep(2000);

    // Step 4: Login as User 2
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.loginUser2 = await login(page, TEST_USERS.user2.email, TEST_USERS.user2.password);
    if (!results.loginUser2) {
      throw new Error('Failed to login as User 2');
    }

    await sleep(3000); // Wait for real-time listener to initialize

    // DEBUG: Get User 2's Firebase Auth UID using window object
    console.log('\n🔍 DEBUGGING: Checking User 2 information...');
    const user2Info = await page.evaluate(() => {
      // Access Firebase through window or React context
      try {
        // Try to get from window if exposed
        if (window.firebase && window.firebase.auth) {
          const user = window.firebase.auth().currentUser;
          return {
            uid: user?.uid || null,
            email: user?.email || null,
            uidType: typeof user?.uid,
            uidLength: user?.uid?.length
          };
        }
        // Try React DevTools or other methods
        return { error: 'Firebase not accessible via window' };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    // Alternative: Get from the page's console logs or check the actual logged in user
    // Since we can't easily access Firebase directly, let's use the contactService
    console.log('📋 Attempting to get User 2 info from page context...');
    
    // Use contactService to check - it will use the current user's UID
    const firestoreCheck = await page.evaluate(async () => {
      try {
        // Use the contactService that's already loaded
        const { contactService } = await import('./src/services/contactService.js');
        
        // Get current user from auth context (this should be User 2 after login)
        // We'll get the UID from the getPendingRequests call logs
        // For now, let's check what requests exist by querying all
        
        // Access db through the service
        const { db } = await import('./src/services/firebaseConfig.js');
        const { collection, getDocs } = await import('firebase/firestore');
        
        const requestsRef = collection(db, 'contactRequests');
        const allSnapshot = await getDocs(requestsRef);
        
        const allRequests = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          allRequests.push({
            id: doc.id,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            status: data.status,
            createdAt: data.createdAt
          });
        });
        
        return {
          allRequests: allRequests,
          totalCount: allRequests.length
        };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    });
    
    console.log('📋 Firestore Query Results:', JSON.stringify(firestoreCheck, null, 2));
    
    if (firestoreCheck.error) {
      console.log('⚠️ Error checking Firestore:', firestoreCheck.error);
      console.log('   This is expected - we cannot directly access Firestore from Puppeteer');
      console.log('   Check the browser console logs above to see what toUserId is being queried');
    } else if (firestoreCheck.allRequests && firestoreCheck.allRequests.length > 0) {
      console.log(`✅ Found ${firestoreCheck.allRequests.length} contact request(s) in Firestore:`);
      firestoreCheck.allRequests.forEach((req, i) => {
        console.log(`   Request ${i + 1}:`, {
          id: req.id,
          fromUserId: req.fromUserId,
          toUserId: req.toUserId,
          status: req.status,
          createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : 'N/A'
        });
      });
      console.log('\n💡 Compare the toUserId above with the userId being queried in the logs');
      console.log('   Look for "Query userId:" in the console logs above');
    } else {
      console.log('⚠️ No contact requests found in Firestore at all');
      console.log('   This means the request was never saved, or was deleted');
    }
    
    // Extract User 2's UID from console logs
    const user2UidFromLogs = consoleLogs
      .filter(log => log.text.includes('subscribeToPendingRequests') || log.text.includes('getPendingRequests'))
      .map(log => {
        const match = log.text.match(/userId[:\s]+([A-Za-z0-9]{28})/);
        return match ? match[1] : null;
      })
      .filter(uid => uid)[0];
    
    if (user2UidFromLogs) {
      console.log(`\n📋 User 2 UID extracted from logs: ${user2UidFromLogs}`);
      if (firestoreCheck.allRequests && firestoreCheck.allRequests.length > 0) {
        firestoreCheck.allRequests.forEach((req, i) => {
          const matches = String(req.toUserId) === String(user2UidFromLogs);
          console.log(`   Request ${i + 1} toUserId matches User 2: ${matches ? '✅ YES' : '❌ NO'}`);
          if (!matches) {
            console.log(`      Document toUserId: "${req.toUserId}" (length: ${req.toUserId?.length})`);
            console.log(`      User 2 UID:        "${user2UidFromLogs}" (length: ${user2UidFromLogs?.length})`);
          }
        });
      }
    }

    // Step 5: Check pending requests count
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const requestsCount = await getPendingRequestsCount(page);
    console.log(`📊 Pending requests count: ${requestsCount}`);
    results.checkRequestsCount = requestsCount > 0;
    
    if (results.checkRequestsCount) {
      console.log('✅ Pending requests count is correct (real-time listener working!)');
    } else {
      console.log('⚠️ Pending requests count is 0 - request may not have been received');
      // Wait a bit more for real-time update
      await sleep(5000);
      const retryCount = await getPendingRequestsCount(page);
      console.log(`📊 Retry count: ${retryCount}`);
      results.checkRequestsCount = retryCount > 0;
    }

    // Step 6: Open modal
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.openModal = await openContactRequestsModal(page);
    await sleep(2000);

    // Step 7: Check if requests are visible
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.requestsVisible = await checkPendingRequestsVisible(page);

    // Step 8: Accept request
    if (results.requestsVisible) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      results.acceptRequest = await acceptContactRequest(page);
      await sleep(2000);
    }

    // Final results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Results Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Login User 1:        ${results.loginUser1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Send Request:        ${results.sendRequest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Logout User 1:       ${results.logoutUser1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Login User 2:        ${results.loginUser2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Requests Count > 0:  ${results.checkRequestsCount ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Open Modal:         ${results.openModal ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Requests Visible:   ${results.requestsVisible ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Accept Request:     ${results.acceptRequest ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r);
    const criticalPassed = results.loginUser1 && results.sendRequest && 
                          results.loginUser2 && results.checkRequestsCount && 
                          results.requestsVisible;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (criticalPassed) {
      console.log('✅ CRITICAL TESTS PASSED - Contact request feature is working!');
      if (allPassed) {
        console.log('✅ ALL TESTS PASSED!');
      } else {
        console.log('⚠️ Some non-critical tests failed, but core functionality works');
      }
    } else {
      console.log('❌ CRITICAL TESTS FAILED - Contact request feature has issues');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // DEBUG: Show relevant console logs
    console.log('\n🔍 DEBUGGING: Relevant Console Logs:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const relevantLogs = consoleLogs.filter(log => 
      log.text.includes('toUserId') || 
      log.text.includes('fromUserId') || 
      log.text.includes('userId') ||
      log.text.includes('Query') ||
      log.text.includes('getPendingRequests') ||
      log.text.includes('subscribeToPendingRequests') ||
      log.text.includes('MISMATCH') ||
      log.text.includes('normalized')
    );
    
    if (relevantLogs.length > 0) {
      relevantLogs.forEach(log => {
        console.log(`[${log.type}] ${log.text}`);
      });
    } else {
      console.log('No relevant logs found');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await sleep(3000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (CONFIG.screenshotOnError) {
      try {
        const page = await browser.pages().then(pages => pages[0]);
        if (page) {
          await takeScreenshot(page, 'test-contact-request-error.png');
        }
      } catch (screenshotError) {
        console.error('Could not take screenshot:', screenshotError);
      }
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

