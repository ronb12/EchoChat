/**
 * Automated Contact Request Test with Console Monitoring
 * Monitors console logs to diagnose and fix contact request issues
 */

const puppeteer = require('puppeteer');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const TEST_USERS = {
  user1: {
    email: 'ronellbradley@bradleyvs.com',
    password: process.env.TEST_USER1_PASSWORD || process.env.TEST_PASSWORD || '121179'
  },
  user2: {
    email: 'ronellbradley@gmail.com',
    password: process.env.TEST_USER2_PASSWORD || process.env.TEST_PASSWORD || '121179'
  }
};

const consoleLogs = [];
const errors = [];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findFrontendServer() {
  const ports = [3002, 5173, 3000];
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok) return port;
    } catch {}
  }
  return null;
}

async function login(page, email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);
  
  try {
    // Wait for page to load
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);

    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!(document.querySelector('.chat-area') || document.querySelector('.app-header'));
    });

    if (isLoggedIn) {
      console.log('✅ Already logged in');
      return true;
    }

    // Find and click login button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(b => 
        b.textContent?.includes('Log In') || b.textContent?.includes('Sign In')
      );
      if (btn) btn.click();
    });
    await sleep(2000);

    // Fill login form
    await page.evaluate((email, password) => {
      const emailInput = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
      const submitBtn = document.querySelector('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")');
      
      if (emailInput) emailInput.value = email;
      if (passwordInput) passwordInput.value = password;
      if (emailInput) emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      if (passwordInput) passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      if (submitBtn) submitBtn.click();
    }, email, password);

    await sleep(5000);

    // Verify login
    const loggedIn = await page.evaluate(() => {
      return !!(document.querySelector('.chat-area') || document.querySelector('.app-header'));
    });

    if (loggedIn) {
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

async function sendContactRequest(page, targetEmail) {
  console.log(`\n📤 Sending contact request to ${targetEmail}...`);
  
  try {
    // Open new chat modal (Cmd+K or button)
    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    await sleep(2000);

    // Alternative: click new chat button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('New Chat') || b.textContent?.includes('New') || b.getAttribute('data-testid') === 'new-chat-button'
      );
      if (btn) btn.click();
    });
    await sleep(2000);

    // Search for user
    await page.evaluate((email) => {
      const searchInput = document.querySelector('input[type="text"], input[placeholder*="search" i], input[placeholder*="email" i], input[placeholder*="username" i]');
      if (searchInput) {
        searchInput.value = email;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    }, targetEmail);
    await sleep(3000);

    // Click search button or wait for results
    await page.evaluate(() => {
      const searchBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Search') || b.textContent?.includes('Find')
      );
      if (searchBtn) searchBtn.click();
    });
    await sleep(3000);

    // Click "Send Contact Request" button
    const requestSent = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Send Contact Request') || b.textContent?.includes('Contact Request')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (requestSent) {
      console.log('✅ Contact request button clicked');
      await sleep(3000);
      return true;
    } else {
      console.log('❌ Could not find "Send Contact Request" button');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending contact request:', error.message);
    return false;
  }
}

async function checkPendingRequests(page) {
  console.log(`\n🔍 Checking for pending contact requests...`);
  
  try {
    // Click Requests button in header
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Requests') || b.getAttribute('data-testid') === 'requests-button'
      );
      if (btn) btn.click();
    });
    await sleep(3000);

    // Check if requests modal is open and has requests
    const hasRequests = await page.evaluate(() => {
      const modal = document.querySelector('.modal, [class*="modal"], [class*="Modal"]');
      if (!modal) return false;
      
      const requestItems = Array.from(modal.querySelectorAll('div, li')).filter(el => 
        el.textContent && (
          el.textContent.includes('ronellbradley') ||
          el.textContent.includes('Request') ||
          el.textContent.includes('Accept')
        )
      );
      
      return requestItems.length > 0;
    });

    return hasRequests;
  } catch (error) {
    console.error('❌ Error checking pending requests:', error.message);
    return false;
  }
}

async function runTest() {
  console.log('🧪 Starting Automated Contact Request Test with Console Monitoring\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const port = await findFrontendServer();
  if (!port) {
    console.error('❌ No frontend server found on ports 3002, 5173, or 3000');
    process.exit(1);
  }
  console.log(`✅ Found frontend server on port ${port}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Monitor console logs
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text, timestamp: Date.now() });
    
    // Log important messages
    if (text.includes('contact request') || text.includes('Contact request') || 
        text.includes('pending') || text.includes('toUserId') || 
        text.includes('MISMATCH') || text.includes('Error')) {
      console.log(`📋 [${msg.type()}] ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error);
    console.error('❌ Page error:', error.message);
  });

  try {
    // Step 1: Login as User 1
    const login1 = await login(page, TEST_USERS.user1.email, TEST_USERS.user1.password);
    if (!login1) {
      console.error('❌ Failed to login as User 1');
      await browser.close();
      process.exit(1);
    }

    await sleep(2000);

    // Step 2: Send contact request
    const sent = await sendContactRequest(page, TEST_USERS.user2.email);
    if (!sent) {
      console.error('❌ Failed to send contact request');
    }

    await sleep(5000);

    // Step 3: Logout
    console.log('\n🚪 Logging out...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Logout') || b.textContent?.includes('Sign Out')
      );
      if (btn) btn.click();
    });
    await sleep(3000);

    // Step 4: Login as User 2
    const login2 = await login(page, TEST_USERS.user2.email, TEST_USERS.user2.password);
    if (!login2) {
      console.error('❌ Failed to login as User 2');
      await browser.close();
      process.exit(1);
    }

    await sleep(3000);

    // Step 5: Check for pending requests
    const hasRequests = await checkPendingRequests(page);
    
    // Analyze console logs
    console.log('\n\n📊 CONSOLE LOG ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const relevantLogs = consoleLogs.filter(log => 
      log.text.includes('contact request') || log.text.includes('toUserId') || 
      log.text.includes('fromUserId') || log.text.includes('MISMATCH') ||
      log.text.includes('pending') || log.text.includes('Query')
    );

    relevantLogs.forEach(log => {
      console.log(`[${log.type.toUpperCase()}] ${log.text}`);
    });

    if (hasRequests) {
      console.log('\n✅ SUCCESS: Pending contact request found!');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ FAILED: No pending contact request found');
      console.log('\n🔍 DIAGNOSIS:');
      
      // Check for common issues
      const mismatchLogs = consoleLogs.filter(log => log.text.includes('MISMATCH'));
      if (mismatchLogs.length > 0) {
        console.log('⚠️  UserId mismatch detected in logs');
      }

      const errorLogs = errors.concat(consoleLogs.filter(log => log.type === 'error'));
      if (errorLogs.length > 0) {
        console.log('⚠️  Errors found:', errorLogs.length);
      }

      await browser.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
    await browser.close();
    process.exit(1);
  }
}

runTest();

