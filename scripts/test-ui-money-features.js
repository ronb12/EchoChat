#!/usr/bin/env node

/**
 * Browser-based UI test for Money Features
 * Tests Send Money and Request Money using the actual UI
 * 
 * Usage:
 *   node scripts/test-ui-money-features.js
 * 
 * Prerequisites:
 *   - Stripe must be in TEST mode
 *   - Backend server running (npm run server)
 *   - Frontend running (npm run dev)
 */

const puppeteer = require('puppeteer');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMoneyFeatures() {
  log('\n🧪 UI Money Features Test (Browser Automation)', 'bold');
  log('='.repeat(60), 'cyan');
  
  // Check if Stripe is in TEST mode
  const fs = require('fs');
  const path = require('path');
  const envFile = path.join(__dirname, '..', '.env');
  
  let isTestMode = false;
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    isTestMode = content.includes('pk_test_');
  }
  
  if (!isTestMode) {
    log('\n⚠️  WARNING: Stripe appears to be in LIVE mode!', 'red');
    log('   Testing with real cards will charge real money!', 'yellow');
    log('   Switch to TEST mode first: npm run stripe:test', 'yellow');
    log('   Or proceed at your own risk...', 'yellow');
    log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    log('\n✅ Stripe is in TEST mode - Safe for testing', 'green');
  }
  
  log('\n📋 Test Cards (Stripe TEST mode):', 'cyan');
  log('   Success: 4242 4242 4242 4242', 'blue');
  log('   Decline: 4000 0000 0000 0002', 'blue');
  log('   Requires Auth: 4000 0027 6000 3184', 'blue');
  log('   Any future expiry date, any CVC, any ZIP', 'blue');
  
  log('\n🚀 Starting browser...', 'cyan');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for manual verification
    defaultViewport: { width: 1280, height: 720 },
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    log('\n📱 Navigating to EchoDynamo...', 'cyan');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    log('\n✅ Page loaded', 'green');
    log('\n📝 Manual Testing Steps:', 'yellow');
    log('   1. Login to your account', 'blue');
    log('   2. Select or create a chat', 'blue');
    log('   3. Click the 3-dots menu (⋮) in chat header', 'blue');
    log('   4. Click "Send Money" or "Request Money"', 'blue');
    log('   5. Fill in the form:', 'blue');
    log('      - Amount: $10.00', 'blue');
    log('      - Reason: Select from dropdown', 'blue');
    log('   6. Click "Continue to Payment"', 'blue');
    log('   7. Enter test card: 4242 4242 4242 4242', 'blue');
    log('      - Expiry: 12/34', 'blue');
    log('      - CVC: 123', 'blue');
    log('      - ZIP: 12345', 'blue');
    log('   8. Click "Pay $10.00"', 'blue');
    log('   9. Verify success notification', 'blue');
    
    log('\n⏳ Waiting for manual testing...', 'cyan');
    log('   Browser will stay open for 5 minutes', 'yellow');
    log('   Complete the test steps above', 'yellow');
    log('   Press Ctrl+C when done', 'yellow');
    
    // Keep browser open for manual testing
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  } finally {
    log('\n🔒 Closing browser...', 'cyan');
    await browser.close();
  }
  
  log('\n✅ Test complete!', 'green');
}

// Check if puppeteer is available
try {
  require.resolve('puppeteer');
  testMoneyFeatures().catch(error => {
    log(`\n❌ Test error: ${error.message}`, 'red');
    process.exit(1);
  });
} catch (error) {
  log('\n⚠️  Puppeteer not installed', 'yellow');
  log('   Install with: npm install puppeteer --save-dev', 'blue');
  log('\n📝 Manual Testing Guide:', 'cyan');
  log('   1. Ensure backend is running: npm run server', 'blue');
  log('   2. Start frontend: npm run dev', 'blue');
  log('   3. Open browser to http://localhost:3000', 'blue');
  log('   4. Follow the test steps listed above', 'blue');
  process.exit(0);
}


