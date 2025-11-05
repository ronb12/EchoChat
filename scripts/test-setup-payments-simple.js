#!/usr/bin/env node

/**
 * Simple Test: Set Up Payments Button Functionality
 * Tests if clicking the button triggers the correct API call
 */

const puppeteer = require('puppeteer');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testSetupPaymentsButton() {
  log('\n🧪 Testing "Set Up Payments" Button', 'bold');
  log('='.repeat(50), 'cyan');
  
  // Find frontend server
  const http = require('http');
  let port = null;
  for (const p of [3000, 3002, 5173]) {
    try {
      await new Promise((resolve, reject) => {
        http.get(`http://localhost:${p}`, (res) => resolve(p)).on('error', reject);
      });
      port = p;
      break;
    } catch {}
  }
  
  if (!port) {
    log('❌ Frontend server not found', 'red');
    process.exit(1);
  }
  
  log(`✅ Found server on port ${port}`, 'green');
  log('\n🚀 Opening browser...', 'cyan');
  
  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1280, height: 720 } });
  const page = await browser.newPage();
  
  // Track network requests
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('stripe') || request.url().includes('create-account')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData()
      });
    }
  });
  
  try {
    // Navigate
    log(`\n📱 Loading http://localhost:${port}...`, 'cyan');
    await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Open Settings
    log('\n⚙️  Opening Settings...', 'cyan');
    await page.evaluate(() => {
      // Try to click settings button or avatar
      const btn = document.querySelector('button[aria-label*="Settings"], .settings-button, .user-avatar');
      if (btn) btn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find and click "Set Up Payments" button
    log('\n💳 Looking for "Set Up Payments" button...', 'cyan');
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => 
        b.textContent.includes('Set Up Payments') || 
        b.textContent.includes('Set up payments') ||
        b.textContent.match(/Set.*Up.*Payment/i)
      );
      if (btn) {
        return {
          found: true,
          text: btn.textContent.trim(),
          visible: btn.offsetParent !== null,
          disabled: btn.disabled
        };
      }
      return { found: false };
    });
    
    if (!buttonInfo.found) {
      log('❌ Button not found', 'red');
      log('   Make sure you\'re on the Payments section in Settings', 'yellow');
      await browser.close();
      return;
    }
    
    log(`✅ Found button: "${buttonInfo.text}"`, 'green');
    
    if (buttonInfo.disabled) {
      log('⚠️  Button is disabled', 'yellow');
    }
    
    if (!buttonInfo.visible) {
      log('⚠️  Button is not visible (might need to scroll)', 'yellow');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Set Up Payments'));
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Click the button
    log('\n🖱️  Clicking button...', 'cyan');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Set Up Payments'));
      if (btn) btn.click();
    });
    
    // Wait for API call or redirect
    log('⏳ Waiting for API call or redirect...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check results
    const currentUrl = page.url();
    const hasApiCall = requests.length > 0;
    const isRedirect = currentUrl.includes('stripe.com') || currentUrl.includes('checkout');
    
    log('\n📊 Test Results:', 'bold');
    log('='.repeat(50), 'cyan');
    
    if (hasApiCall) {
      log('✅ API call detected!', 'green');
      requests.forEach((req, i) => {
        log(`   ${i + 1}. ${req.method} ${req.url}`, 'cyan');
      });
    } else {
      log('⚠️  No API call detected', 'yellow');
      log('   Button might not be triggering correctly', 'yellow');
    }
    
    if (isRedirect) {
      log('✅ Redirect to Stripe detected!', 'green');
      log(`   URL: ${currentUrl.substring(0, 60)}...`, 'cyan');
    } else {
      log('⚠️  No redirect detected', 'yellow');
      log('   Check if account creation is in progress...', 'yellow');
    }
    
    // Check for errors
    const errors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.notification-error, .toast-error, [role="alert"]'))
        .map(el => el.textContent)
        .filter(text => text.includes('error') || text.includes('Error') || text.includes('Failed'));
    });
    
    if (errors.length > 0) {
      log('\n❌ Errors detected:', 'red');
      errors.forEach(err => log(`   - ${err}`, 'red'));
    }
    
    // Summary
    log('\n📋 Summary:', 'bold');
    if (hasApiCall && (isRedirect || requests.some(r => r.url.includes('create-account')))) {
      log('✅ Button is working correctly!', 'green');
      log('   - Button found and clicked', 'green');
      log('   - API call triggered', 'green');
      if (isRedirect) {
        log('   - Redirected to Stripe', 'green');
      }
    } else if (hasApiCall) {
      log('⚠️  Button triggered API call but no redirect', 'yellow');
      log('   - Check API response for errors', 'yellow');
    } else {
      log('❌ Button may not be working', 'red');
      log('   - No API call detected', 'red');
      log('   - Check browser console for errors', 'yellow');
    }
    
    log('\n⏸️  Keeping browser open for 15 seconds...', 'yellow');
    log('   Check the browser to see what happened', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  } finally {
    await browser.close();
  }
}

testSetupPaymentsButton().catch(console.error);

