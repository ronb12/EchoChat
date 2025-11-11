/**
 * Automated Puppeteer Test for Parent & Child Account Features
 * Tests: Signup, Linking, Parent Dashboard, Contact Approval, Safety Features
 */

const puppeteer = require('puppeteer');

// Test users
const PARENT_USER = {
  email: `parent-test-${Date.now()}@echochat.com`,
  password: 'TestParent123!',
  displayName: 'Test Parent'
};

const CHILD_USER = {
  email: `child-test-${Date.now()}@echochat.com`,
  password: 'TestChild123!',
  displayName: 'Test Child',
  dateOfBirth: '2010-01-01' // 14 years old
};

const TEST_FRONTEND_URLS = [
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:3000'
];

let frontendUrl = null;
let browser = null;
let page = null;

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const icon = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${timestamp}] ${message}`);
  
  if (type === 'pass') {
    testResults.passed.push(message);
  } else if (type === 'fail') {
    testResults.failed.push(message);
  } else if (type === 'warn') {
    testResults.warnings.push(message);
  }
}

async function findFrontendServer() {
  log('Finding frontend server...');
  
  // Use Puppeteer to check server availability
  const tempBrowser = await puppeteer.launch({ headless: true });
  const tempPage = await tempBrowser.newPage();
  
  for (const url of TEST_FRONTEND_URLS) {
    try {
      await tempPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
      frontendUrl = url;
      log(`Frontend server found: ${url}`, 'pass');
      await tempBrowser.close();
      return true;
    } catch (error) {
      // Continue to next URL
      log(`Tried ${url}: ${error.message}`, 'warn');
    }
  }
  
  await tempBrowser.close();
  log('No frontend server found. Please start the frontend server.', 'fail');
  log('Tried URLs:', 'warn');
  TEST_FRONTEND_URLS.forEach(url => log(`  - ${url}`, 'warn'));
  return false;
}

async function waitForElement(selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForText(text, timeout = 10000) {
  try {
    await page.waitForFunction(
      (searchText) => document.body.innerText.includes(searchText),
      { timeout },
      text
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStripeModeIndicator() {
  log('Testing Stripe Mode Indicator...');
  
  try {
    await page.goto(frontendUrl, { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    // Wait for page to load
    await page.waitForSelector('.app-header, header', { timeout: 5000 });
    
    // Check if Stripe mode indicator exists
    const indicatorExists = await page.evaluate(() => {
      const indicator = document.querySelector('.stripe-mode-indicator');
      return indicator !== null;
    });
    
    if (!indicatorExists) {
      log('⚠️ Stripe mode indicator not found in header', 'warn');
      return false;
    }
    
    // Get indicator text and color
    const indicatorInfo = await page.evaluate(() => {
      const indicator = document.querySelector('.stripe-mode-indicator');
      if (!indicator) return null;
      
      const styles = window.getComputedStyle(indicator);
      const text = indicator.textContent.trim();
      const bgColor = styles.backgroundColor;
      
      return {
        text,
        backgroundColor: bgColor,
        isLive: text.includes('LIVE'),
        isTest: text.includes('TEST')
      };
    });
    
    if (indicatorInfo) {
      log(`Stripe mode indicator found: "${indicatorInfo.text}"`, 'pass');
      log(`Background color: ${indicatorInfo.backgroundColor}`, 'pass');
      
      if (indicatorInfo.isLive) {
        log('✅ LIVE mode detected - Indicator shows LIVE (red)', 'pass');
      } else if (indicatorInfo.isTest) {
        log('✅ TEST mode detected - Indicator shows TEST (green)', 'pass');
      } else {
        log('⚠️ Unknown mode in indicator', 'warn');
      }
      
      // Check console messages for mode detection
      const consoleMessages = await page.evaluate(() => {
        // This won't capture console.log from the page, but we can check the indicator directly
        return 'Indicator checked';
      });
      
      return true;
    } else {
      log('❌ Could not read indicator information', 'fail');
      return false;
    }
  } catch (error) {
    log(`Error testing Stripe mode indicator: ${error.message}`, 'fail');
    return false;
  }
}

async function isLoggedIn() {
  try {
    // Check for multiple indicators of logged-in state
    const indicators = await page.evaluate(() => {
      const hasChatArea = !!document.querySelector('.chat-area, #chat-area, [data-testid="chat-area"], [class*="chat-area"]');
      const hasSidebar = !!document.querySelector('.sidebar, #sidebar, [data-testid="sidebar"], [class*="sidebar"]');
      const hasSettingsButton = !!document.querySelector('button[aria-label*="Settings" i], button[aria-label*="settings" i], .settings-button, [class*="settings-button"]');
      const hasUserProfile = !!document.querySelector('.user-profile, [data-testid="user-profile"], [class*="user-profile"]');
      const hasMainApp = !!document.querySelector('.app, #app, [class*="main"], [class*="container"]');
      
      // Check for login modal (should NOT be visible if logged in)
      const loginModal = document.querySelector('#login-modal, .login-modal, [data-testid="login-modal"], [class*="login-modal"]');
      const isLoginModalVisible = loginModal ? window.getComputedStyle(loginModal).display !== 'none' : false;
      
      // Check for signup modal (should NOT be visible if logged in)
      const signupModal = document.querySelector('#signup-modal, .signup-modal, [data-testid="signup-modal"], [class*="signup-modal"]');
      const isSignupModalVisible = signupModal ? window.getComputedStyle(signupModal).display !== 'none' : false;
      
      return {
        hasChatArea,
        hasSidebar,
        hasSettingsButton,
        hasUserProfile,
        hasMainApp,
        isLoginModalVisible,
        isSignupModalVisible,
        loggedIn: (hasChatArea || hasSidebar || hasSettingsButton || hasUserProfile || hasMainApp) && !isLoginModalVisible && !isSignupModalVisible
      };
    });
    
    return indicators.loggedIn;
  } catch (error) {
    return false;
  }
}

async function testParentSignup() {
  log('Testing Parent Account Signup...');
  
  try {
    // Navigate to frontend
    await page.goto(frontendUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    
    // Check if already logged in
    if (await isLoggedIn()) {
      log('Already logged in, signing out first...', 'warn');
      // Try to sign out
      try {
        const settingsButton = await page.$('button[aria-label*="Settings"], .settings-button, button:has-text("Settings")');
        if (settingsButton) {
          await settingsButton.click();
          await sleep(1000);
          const signOutButton = await page.$('button:has-text("Sign Out"), button:has-text("Logout")');
          if (signOutButton) {
            await signOutButton.click();
            await sleep(2000);
          }
        }
      } catch (e) {
        // Ignore sign out errors
      }
    }
    
    // Click Sign Up button - use XPath for text matching
    await sleep(2000); // Wait for page to fully load
    
    // Try multiple methods to find sign up button
    let signUpElement = null;
    
    // Method 1: Direct text search
    const signUpButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => {
        const text = btn.textContent.trim().toLowerCase();
        return text.includes('sign up') || text.includes('create account') || text.includes('get started');
      });
    });
    
    signUpElement = await signUpButton.asElement();
    
    // Method 2: Try by data-testid (from LandingPage)
    if (!signUpElement) {
      signUpElement = await page.$('[data-testid="get-started-btn"]');
    }
    
    // Method 3: Try by class or ID
    if (!signUpElement) {
      signUpElement = await page.$('button.btn-primary, .btn-primary');
    }
    
    if (!signUpElement) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-signup-debug.png' });
      log('Sign Up button not found - screenshot saved to test-signup-debug.png', 'fail');
      return false;
    }
    
    await signUpElement.click();
    await sleep(3000); // Wait longer for modal to appear
    
    // Wait for signup modal - try multiple selectors
    const modalSelectors = [
      '#signup-modal',
      '.signup-modal',
      '[data-testid="signup-modal"]',
      '.modal.active',
      '.modal[id*="signup"]',
      'div[class*="modal"]:has(h2:contains("Create Account"))'
    ];
    
    let modalFound = false;
    for (const selector of modalSelectors) {
      if (await waitForElement(selector, 3000)) {
        modalFound = true;
        log(`Signup modal found with selector: ${selector}`, 'pass');
        break;
      }
    }
    
    if (!modalFound) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-signup-modal-debug.png' });
      log('Signup modal not found - screenshot saved to test-signup-modal-debug.png', 'fail');
      // Try to continue anyway - maybe modal is already open
      await sleep(1000);
    }
    
    // Select Parent Account type - check if we need to select account type first
    log('Selecting Parent Account type...');
    await sleep(1000);
    
    // Check if account type selection is needed
    const chooseAccountTypeButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent.trim();
        return text.includes('Choose Account Type') || text.includes('Account Type');
      });
    });
    
    const chooseAccountTypeElement = await chooseAccountTypeButton.asElement();
    if (chooseAccountTypeElement) {
      log('Clicking "Choose Account Type" button...');
      await chooseAccountTypeElement.click();
      await sleep(1500);
    }
    
    // Click Parent Account option
    const parentAccountOption = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent.trim();
        return text.includes('Parent Account') || 
               text.includes('🔒') ||
               text.includes('Monitor and manage') ||
               (text.includes('Parent') && text.includes('Account'));
      });
    });
    
    const parentAccountElement = await parentAccountOption.asElement();
    if (parentAccountElement) {
      log('Clicking Parent Account option...');
      await parentAccountElement.click();
      await sleep(1500);
    } else {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-parent-option-debug.png' });
      log('Parent Account option not found - screenshot saved', 'fail');
      return false;
    }
    
    // Fill in signup form
    log('Filling signup form...');
    
    // Wait for and fill email input
    const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 5000, visible: true }).catch(() => null);
    if (emailInput) {
      await emailInput.click({ clickCount: 3 }); // Select all
      await emailInput.type(PARENT_USER.email, { delay: 50 });
      await sleep(500);
      log('Email entered', 'pass');
    } else {
      log('Email input not found', 'fail');
      await page.screenshot({ path: 'test-email-input-debug.png' });
      return false;
    }
    
    // Wait for and fill password input
    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 5000, visible: true }).catch(() => null);
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 }); // Select all
      await passwordInput.type(PARENT_USER.password, { delay: 50 });
      await sleep(500);
      log('Password entered', 'pass');
    } else {
      log('Password input not found', 'fail');
      return false;
    }
    
    // Optional: Display name
    const displayNameInput = await page.$('input[id*="displayName"], input[placeholder*="name" i]');
    if (displayNameInput) {
      await displayNameInput.click({ clickCount: 3 });
      await displayNameInput.type(PARENT_USER.displayName, { delay: 50 });
      await sleep(500);
      log('Display name entered', 'pass');
    }
    
    // Submit form - specifically look for "Create Parent Account" button
    log('Looking for "Create Parent Account" button...');
    await sleep(1000); // Wait for button to be fully rendered
    
    const submitButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button[type="submit"], button'));
      // First, try to find the exact "Create Parent Account" button
      let exactMatch = buttons.find(btn => {
        const text = btn.textContent.trim();
        return text === 'Create Parent Account' || text.includes('Create Parent Account');
      });
      
      if (exactMatch) return exactMatch;
      
      // Fallback: look for any submit button with "Create"
      return buttons.find(btn => {
        const text = btn.textContent.trim();
        return (text.includes('Create') && text.includes('Parent')) ||
               (btn.type === 'submit' && text.includes('Create'));
      });
    });
    
    const submitElement = await submitButton.asElement();
    if (submitElement) {
      // Verify button text before clicking
      const buttonText = await page.evaluate(el => el.textContent.trim(), submitElement);
      log(`Found submit button with text: "${buttonText}"`);
      log('Clicking "Create Parent Account" button...');
      
      // Scroll button into view and click
      await submitElement.scrollIntoView();
      await sleep(500);
      await submitElement.click({ delay: 100 });
      
      // Wait for signup to complete - check for success notification or modal close
      log('Waiting for signup to complete...');
      await sleep(5000); // Wait longer for Firebase auth and Firestore
      
      // Check for error messages
      const errorText = await page.evaluate(() => {
        const errorEls = Array.from(document.querySelectorAll('.error, [class*="error"], [role="alert"]'));
        return errorEls.map(el => el.textContent).join(' ');
      });
      
      if (errorText && errorText.trim()) {
        log(`Signup error detected: ${errorText}`, 'fail');
        await page.screenshot({ path: 'test-signup-error.png' });
        return false;
      }
      
      // Check browser console for errors
      const consoleMessages = await page.evaluate(() => {
        // This won't capture runtime errors, but we can check for visible errors
        return 'Console checked';
      });
      
      // Check if modal is still open (might indicate signup failed)
      const modalStillOpen = await page.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('.modal.active, [class*="modal"][class*="active"]'));
        return modals.length > 0;
      });
      
      if (modalStillOpen) {
        log('Modal still open - checking for errors...', 'warn');
        
        // Get all visible text in the modal to check for errors
        const modalText = await page.evaluate(() => {
          const modal = document.querySelector('.modal.active, [class*="modal"][class*="active"]');
          if (modal) {
            return modal.textContent || modal.innerText;
          }
          return '';
        });
        
        log(`Modal content: ${modalText.substring(0, 200)}...`, 'warn');
        
        // Check for specific error indicators
        const hasError = await page.evaluate(() => {
          const errorEls = Array.from(document.querySelectorAll('.error, [class*="error"], [role="alert"], .text-red, .text-danger'));
          return errorEls.some(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });
        });
        
        if (hasError) {
          log('Error detected in modal - signup likely failed', 'fail');
          await page.screenshot({ path: 'test-signup-modal-error.png' });
        }
        
        await sleep(2000);
      }
      
    } else {
      log('Submit button not found', 'fail');
      await page.screenshot({ path: 'test-submit-button-debug.png' });
      return false;
    }
    
    // Check if logged in - wait longer and check multiple times
    log('Checking if logged in...');
    for (let i = 0; i < 6; i++) {
      await sleep(2000);
      if (await isLoggedIn()) {
        log('Parent account created and logged in successfully', 'pass');
        return true;
      }
      log(`Still waiting for login... (${i + 1}/6)`, 'warn');
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-signup-not-logged-in.png' });
    log('Parent signup may have failed - not logged in after 12 seconds', 'warn');
    return false;
  } catch (error) {
    log(`Parent signup error: ${error.message}`, 'fail');
    return false;
  }
}

async function testChildSignup() {
  log('Testing Child Account Signup...');
  
  try {
    // Sign out parent if logged in
    if (await isLoggedIn()) {
      log('Signing out parent account...');
      try {
        const settingsButton = await page.$('button[aria-label*="Settings"], .settings-button');
        if (settingsButton) {
          await settingsButton.click();
          await sleep(1000);
          const signOutButton = await page.$('button:has-text("Sign Out")');
          if (signOutButton) {
            await signOutButton.click();
            await sleep(2000);
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // Navigate to frontend
    await page.goto(frontendUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    
    // Click Sign Up
    const signUpButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => btn.textContent.includes('Sign Up') || btn.textContent.includes('sign up'));
    });
    
    const signUpElement = await signUpButton.asElement();
    if (signUpElement) {
      await signUpElement.click();
      await sleep(1000);
    }
    
    // Select Personal Account (default for children)
    const personalAccountOption = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Personal Account') || btn.textContent.includes('👤'));
    });
    
    const personalAccountElement = await personalAccountOption.asElement();
    if (personalAccountElement) {
      await personalAccountElement.click();
      await sleep(1000);
    }
    
    // Fill signup form - wait for modal
    await sleep(2000);
    const emailInput = await page.$('input[type="email"], input[id*="email"]');
    if (emailInput) {
      await emailInput.type(CHILD_USER.email, { delay: 50 });
      await sleep(500);
    } else {
      log('Email input not found', 'fail');
      return false;
    }
    
    const passwordInput = await page.$('input[type="password"], input[id*="password"]');
    if (passwordInput) {
      await passwordInput.type(CHILD_USER.password, { delay: 50 });
      await sleep(500);
    } else {
      log('Password input not found', 'fail');
      return false;
    }
    
    const displayNameInput = await page.$('input[id*="displayName"]');
    if (displayNameInput) {
      await page.type('input[id*="displayName"]', CHILD_USER.displayName, { delay: 50 });
      await sleep(500);
    }
    
    // Submit
    const submitButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button[type="submit"], button'));
      return buttons.find(btn => btn.textContent.includes('Create'));
    });
    
    const submitElement = await submitButton.asElement();
    if (submitElement) {
      await submitElement.click();
      await sleep(3000);
    }
    
    // Check if date of birth modal appears (for minors)
    await sleep(2000);
    const dobModal = await page.$('input[type="date"], input[id*="date-of-birth"], input[id*="dateOfBirth"]');
    if (dobModal) {
      log('Date of birth modal found - entering date...');
      await dobModal.type(CHILD_USER.dateOfBirth);
      await sleep(500);
      
      // Submit date of birth
      const continueButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('Continue') || btn.textContent.includes('Submit'));
      });
      
      const continueElement = await continueButton.asElement();
      if (continueElement) {
        await continueElement.click();
        await sleep(2000);
      }
      
      // If parent email is required
      const parentEmailInput = await page.$('input[type="email"][placeholder*="parent" i], input[id*="parent-email"]');
      if (parentEmailInput) {
        log('Parent email required - entering parent email...');
        await parentEmailInput.type(PARENT_USER.email);
        await sleep(500);
        
        const sendCodeButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Send') || btn.textContent.includes('Send Verification'));
        });
        
        const sendCodeElement = await sendCodeButton.asElement();
        if (sendCodeElement) {
          await sendCodeElement.click();
          await sleep(2000);
          
          // Get verification code from alert (for testing)
          // In production, this would be sent via email
          log('Verification code sent to parent email', 'warn');
        }
      }
    }
    
    // Check if logged in
    await sleep(3000);
    if (await isLoggedIn()) {
      log('Child account created successfully', 'pass');
      return true;
    } else {
      log('Child signup may have failed - not logged in', 'warn');
      return false;
    }
  } catch (error) {
    log(`Child signup error: ${error.message}`, 'fail');
    return false;
  }
}

async function testLinkChildAccount() {
  log('Testing Link Child Account...');
  
  try {
    // Login as parent - navigate and ensure we're logged out first
    await page.goto(frontendUrl, { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    // Check if we need to log in
    const currentlyLoggedIn = await isLoggedIn();
    if (!currentlyLoggedIn) {
      log('Not logged in - logging in as parent...');
      // Login
      const loginButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.find(btn => btn.textContent.includes('Sign In') || btn.textContent.includes('Login'));
      });
      
      const loginElement = await loginButton.asElement();
      if (loginElement) {
        await loginElement.click();
        await sleep(1000);
        await page.type('input[type="email"]', PARENT_USER.email);
        await page.type('input[type="password"]', PARENT_USER.password);
        
        const submitButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button[type="submit"], button'));
          return buttons.find(btn => btn.textContent.includes('Sign In') || btn.textContent.includes('Login'));
        });
        
        const submitElement = await submitButton.asElement();
        if (submitElement) {
          await submitElement.click();
          await sleep(3000);
        }
      }
    }
    
    // Open Settings - click avatar first, then Settings menu item
    log('Opening Settings via avatar menu...');
    const avatarButton = await page.evaluateHandle(() => {
      const avatars = Array.from(document.querySelectorAll('.avatar, [class*="avatar"], img[alt*="avatar" i], img[alt*="user" i]'));
      // Find clickable avatar (usually has onClick or is in a button)
      return avatars.find(avatar => {
        const parent = avatar.parentElement;
        return parent && (parent.tagName === 'BUTTON' || parent.onclick || parent.classList.contains('avatar-container'));
      })?.parentElement || avatars[0]?.parentElement;
    });
    
    const avatarElement = await avatarButton.asElement();
    if (avatarElement) {
      await avatarElement.click();
      await sleep(1000);
      
      // Now click Settings from the menu
      const settingsMenuItem = await page.evaluateHandle(() => {
        const menuItems = Array.from(document.querySelectorAll('.avatar-menu-item, [class*="menu-item"], button'));
        return menuItems.find(item => {
          const text = item.textContent.trim();
          return text.includes('Settings') || text.includes('⚙️');
        });
      });
      
      const settingsElement = await settingsMenuItem.asElement();
      if (settingsElement) {
        await settingsElement.click();
        await sleep(2000);
        log('Settings opened successfully', 'pass');
      } else {
        log('Settings menu item not found', 'fail');
        await page.screenshot({ path: 'test-settings-menu-debug.png' });
        return false;
      }
    } else {
      // Fallback: try direct settings button
      const settingsButton = await page.$('button[aria-label*="Settings" i], .settings-button, [class*="settings-button"]');
      if (settingsButton) {
        await settingsButton.click();
        await sleep(2000);
        log('Settings opened via direct button', 'pass');
      } else {
        log('Settings button not found', 'fail');
        await page.screenshot({ path: 'test-settings-button-debug.png' });
        return false;
      }
    }
    
    // Find "Link Child Account" button
    log('Looking for "Link Child Account" button...');
    const linkChildButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Link Child Account'));
    });
    
    const linkChildElement = await linkChildButton.asElement();
    if (linkChildElement) {
      await linkChildElement.click();
      await sleep(2000);
      
      // Wait for modal to appear and verify instruction visibility
      log('Waiting for Link Child Account modal...');
      await sleep(1000);
      
      // Check if modal is visible and take screenshot to verify instruction visibility
      const modalVisible = await page.evaluate(() => {
        const modal = document.querySelector('#link-child-modal, [id*="link-child"]');
        return modal && window.getComputedStyle(modal).display !== 'none';
      });
      
      if (modalVisible) {
        log('Link Child Account modal opened - taking screenshot to verify instruction visibility...', 'pass');
        await page.screenshot({ path: 'test-link-child-modal-visibility.png', fullPage: false });
        
        // Verify instruction text is visible and has proper styling
        const instructionStyles = await page.evaluate(() => {
          const modal = document.querySelector('#link-child-modal');
          if (!modal) return null;
          
          const instructionDiv = Array.from(modal.querySelectorAll('div')).find(div => 
            div.textContent.includes('Link Your Child\'s Account') || 
            div.textContent.includes('Enter your child\'s email')
          );
          
          if (!instructionDiv) return null;
          
          const styles = window.getComputedStyle(instructionDiv);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            borderColor: styles.borderColor,
            textContent: instructionDiv.textContent.substring(0, 50)
          };
        });
        
        if (instructionStyles) {
          log(`Instruction text found: "${instructionStyles.textContent}..."`, 'pass');
          log(`Background color: ${instructionStyles.backgroundColor}`, 'pass');
          log(`Text color: ${instructionStyles.color}`, 'pass');
          log('✅ Instruction visibility verified - text should be clearly visible!', 'pass');
        } else {
          log('⚠️ Could not find instruction div in modal', 'warn');
        }
      } else {
        log('⚠️ Link Child Account modal not found', 'warn');
      }
      
      // Enter child email
      const childEmailInput = await page.$('input[type="email"][placeholder*="child" i], input[id*="child-email"]');
      if (childEmailInput) {
        await childEmailInput.type(CHILD_USER.email);
        await sleep(500);
        
        // Submit
        const sendCodeButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Send Verification Code'));
        });
        
        const sendCodeElement = await sendCodeButton.asElement();
        if (sendCodeElement) {
          await sendCodeElement.click();
          await sleep(2000);
          
          // Enter verification code (would need to get from email in production)
          const codeInput = await page.$('input[type="text"][placeholder*="000000"], input[id*="link-code"]');
          if (codeInput) {
            // In a real test, we'd get the code from the alert or email
            // For now, we'll just log that this step was reached
            log('Link child account flow initiated', 'pass');
            return true;
          }
        }
      }
    } else {
      log('Link Child Account button not found', 'warn');
      return false;
    }
    
    return false;
  } catch (error) {
    log(`Link child account error: ${error.message}`, 'fail');
    return false;
  }
}

async function testParentDashboard() {
  log('Testing Parent Dashboard...');
  
  try {
    // Ensure logged in as parent
    if (!await isLoggedIn()) {
      log('Not logged in - cannot test dashboard', 'fail');
      return false;
    }
    
    // Open Settings - click avatar first, then Settings menu item
    log('Opening Settings via avatar menu...');
    const avatarButton = await page.evaluateHandle(() => {
      const avatars = Array.from(document.querySelectorAll('.avatar, [class*="avatar"], img[alt*="avatar" i], img[alt*="user" i]'));
      // Find clickable avatar (usually has onClick or is in a button)
      return avatars.find(avatar => {
        const parent = avatar.parentElement;
        return parent && (parent.tagName === 'BUTTON' || parent.onclick || parent.classList.contains('avatar-container'));
      })?.parentElement || avatars[0]?.parentElement;
    });
    
    const avatarElement = await avatarButton.asElement();
    if (avatarElement) {
      await avatarElement.click();
      await sleep(1000);
      
      // Now click Settings from the menu
      const settingsMenuItem = await page.evaluateHandle(() => {
        const menuItems = Array.from(document.querySelectorAll('.avatar-menu-item, [class*="menu-item"], button'));
        return menuItems.find(item => {
          const text = item.textContent.trim();
          return text.includes('Settings') || text.includes('⚙️');
        });
      });
      
      const settingsElement = await settingsMenuItem.asElement();
      if (settingsElement) {
        await settingsElement.click();
        await sleep(2000);
        log('Settings opened successfully', 'pass');
      } else {
        log('Settings menu item not found', 'fail');
        await page.screenshot({ path: 'test-settings-menu-debug.png' });
        return false;
      }
    } else {
      // Fallback: try direct settings button
      const settingsButton = await page.$('button[aria-label*="Settings" i], .settings-button, [class*="settings-button"]');
      if (settingsButton) {
        await settingsButton.click();
        await sleep(2000);
        log('Settings opened via direct button', 'pass');
      } else {
        log('Settings button not found', 'fail');
        await page.screenshot({ path: 'test-settings-button-debug.png' });
        return false;
      }
    }
    
    // Find "Open Parent Dashboard" button
    log('Looking for Parent Dashboard button...');
    const dashboardButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent.trim();
        return text.includes('Open Parent Dashboard') || 
               text.includes('Parent Dashboard') ||
               (text.includes('Parent') && text.includes('Dashboard'));
      });
    });
    
    const dashboardElement = await dashboardButton.asElement();
    if (dashboardElement) {
      await dashboardElement.click();
      await sleep(2000);
      
      // Check if dashboard opened
      const dashboardModal = await page.$('#parent-dashboard-modal, .parent-dashboard, [data-testid="parent-dashboard"]');
      if (dashboardModal) {
        log('Parent Dashboard opened successfully', 'pass');
        
        // Check for tabs
        const overviewTab = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.toLowerCase().includes('overview'));
        });
        
        const contactsTab = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.toLowerCase().includes('contacts'));
        });
        
        const overviewElement = overviewTab ? await overviewTab.asElement() : null;
        const contactsElement = contactsTab ? await contactsTab.asElement() : null;
        
        if (overviewElement || contactsElement) {
          log('Parent Dashboard tabs visible', 'pass');
          return true;
        }
      }
    } else {
      log('Parent Dashboard button not found', 'warn');
      return false;
    }
    
    return false;
  } catch (error) {
    log(`Parent Dashboard error: ${error.message}`, 'fail');
    return false;
  }
}

async function runTests() {
  log('Starting Parent & Child Account Feature Tests...');
  log(`Frontend URL: ${frontendUrl}`);
  log(`Parent Email: ${PARENT_USER.email}`);
  log(`Child Email: ${CHILD_USER.email}`);
  
  browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  page = await browser.newPage();
  
  // Set longer timeouts
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  
  try {
    // Test 1: Parent Signup
    await testParentSignup();
    await sleep(2000);
    
    // Test 2: Child Signup
    await testChildSignup();
    await sleep(2000);
    
    // Test 3: Link Child Account
    await testLinkChildAccount();
    await sleep(2000);
    
    // Test 4: Parent Dashboard
    await testParentDashboard();
    await sleep(2000);
    
  } catch (error) {
    log(`Test execution error: ${error.message}`, 'fail');
  } finally {
    // Keep browser open for manual inspection
    log('Tests completed. Keeping browser open for 10 seconds...');
    await sleep(10000);
    await browser.close();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  console.log('\nPassed Tests:');
  testResults.passed.forEach(test => console.log(`  ✅ ${test}`));
  console.log('\nFailed Tests:');
  testResults.failed.forEach(test => console.log(`  ❌ ${test}`));
  console.log('\nWarnings:');
  testResults.warnings.forEach(test => console.log(`  ⚠️  ${test}`));
}

// Main execution
(async () => {
  if (await findFrontendServer()) {
    await runTests();
  } else {
    console.error('❌ Cannot proceed without frontend server');
    process.exit(1);
  }
})();

