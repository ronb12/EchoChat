#!/usr/bin/env node

/**
 * Full Stripe Payment Flow Test with Test Cards
 * Tests the complete Send Money flow end-to-end
 * 
 * Prerequisites:
 *   - Stripe must be in TEST mode (test cards won't work in LIVE mode)
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

async function testFullStripeFlow() {
  log('\n🧪 Full Stripe Payment Flow Test', 'bold');
  log('='.repeat(60), 'cyan');
  
  // Check Stripe mode
  const fs = require('fs');
  const path = require('path');
  const envFile = path.join(__dirname, '..', '.env');
  
  let isTestMode = false;
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    isTestMode = content.includes('pk_test_');
  }
  
  if (!isTestMode) {
    log('\n❌ ERROR: Stripe is in LIVE mode!', 'red');
    log('   Test cards (4242 4242 4242 4242) only work in TEST mode', 'yellow');
    log('   Switch to TEST mode first:', 'yellow');
    log('   1. Get test keys from: https://dashboard.stripe.com/test/apikeys', 'blue');
    log('   2. Update .env with pk_test_... and sk_test_...', 'blue');
    log('   3. Restart server and frontend', 'blue');
    log('   4. Run this test again', 'blue');
    process.exit(1);
  }
  
  log('\n✅ Stripe is in TEST mode - Safe for testing', 'green');
  
  // Test card details
  const TEST_CARD = {
    number: '4242 4242 4242 4242',
    expiry: '1234',
    cvc: '123',
    zip: '12345'
  };
  
  log('\n📋 Using Test Card:', 'cyan');
  log(`   Number: ${TEST_CARD.number}`, 'blue');
  log(`   Expiry: ${TEST_CARD.expiry}`, 'blue');
  log(`   CVC: ${TEST_CARD.cvc}`, 'blue');
  log(`   ZIP: ${TEST_CARD.zip}`, 'blue');
  
  log('\n🚀 Starting browser...', 'cyan');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser
    defaultViewport: { width: 1280, height: 720 },
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    log('\n📱 Navigating to EchoDynamo...', 'cyan');
    try {
      await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      log('⚠️  Port 3002 not available, trying port 5173...', 'yellow');
      await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    }
    await new Promise(resolve => setTimeout(resolve,  2000));
    
    log('✅ Page loaded', 'green');
    
    // Check if user is logged in
    log('\n🔍 Checking authentication status...', 'cyan');
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('.user-avatar, [data-testid="user-menu"]');
    });
    
    if (!isLoggedIn) {
      log('⚠️  Not logged in - Please login manually', 'yellow');
      log('   Waiting for manual login (2 minutes)...', 'yellow');
      await new Promise(resolve => setTimeout(resolve,  120000));
      
      // Check again
      const stillLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('.user-avatar, [data-testid="user-menu"]');
      });
      
      if (!stillLoggedIn) {
        log('❌ Still not logged in - Cannot proceed', 'red');
        await browser.close();
        process.exit(1);
      }
    }
    
    log('✅ User is logged in', 'green');
    
    // Wait for chat list to load
    log('\n📋 Waiting for chat list...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find and click a chat
    log('\n💬 Looking for a chat to select...', 'cyan');
    const chatSelected = await page.evaluate(() => {
      const chats = document.querySelectorAll('.chat-item, .sidebar-chat-item');
      if (chats.length > 0) {
        chats[0].click();
        return true;
      }
      return false;
    });
    
    if (!chatSelected) {
      log('⚠️  No chats found - Creating new chat...', 'yellow');
      // Try to click new chat button
      await page.click('[data-testid="new-chat-button"], .new-chat-btn, button:has-text("New Chat")').catch(() => {
        log('   Could not find new chat button - please select a chat manually', 'yellow');
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Look for 3-dots menu
    log('\n🔍 Looking for 3-dots menu (⋮)...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try multiple selectors for the menu
    const menuClicked = await page.evaluate(() => {
      // Try various selectors
      const selectors = [
        '.more-options-btn',
        '[aria-label*="more"]',
        '[aria-label*="options"]',
        'button:has-text("⋮")',
        '.chat-header button:last-child'
      ];
      
      for (const selector of selectors) {
        try {
          const btn = document.querySelector(selector);
          if (btn && btn.offsetParent !== null) {
            btn.click();
            return true;
          }
        } catch (e) {}
      }
      return false;
    });
    
    if (!menuClicked) {
      log('⚠️  Could not find 3-dots menu automatically', 'yellow');
      log('   Please click the 3-dots menu (⋮) manually in the chat header', 'yellow');
      log('   Waiting 30 seconds...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      log('✅ Clicked 3-dots menu', 'green');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Look for Send Money option
    log('\n💵 Looking for "Send Money" option...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const sendMoneyClicked = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('.more-menu-item, [role="menuitem"]'));
      const sendMoney = options.find(el => 
        el.textContent.includes('Send Money') || 
        el.textContent.includes('💵')
      );
      if (sendMoney) {
        sendMoney.click();
        return true;
      }
      return false;
    });
    
    if (!sendMoneyClicked) {
      log('⚠️  Could not find "Send Money" option automatically', 'yellow');
      log('   Please click "Send Money" manually', 'yellow');
      log('   Waiting 30 seconds...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      log('✅ Clicked "Send Money"', 'green');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Wait for modal to appear
    log('\n⏳ Waiting for Send Money modal...', 'cyan');
    await page.waitForSelector('#send-money-modal, .modal.active', { timeout: 10000 }).catch(() => {
      log('⚠️  Modal not found - waiting longer...', 'yellow');
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fill in amount
    log('\n💰 Entering amount: $10.00', 'cyan');
    const amountEntered = await page.evaluate(() => {
      const amountInput = document.querySelector('#amount, input[type="number"][placeholder*="0.00"]');
      if (amountInput) {
        amountInput.value = '';
        amountInput.focus();
        amountInput.value = '10';
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    });
    
    if (!amountEntered) {
      log('⚠️  Could not find amount input - please enter $10.00 manually', 'yellow');
    } else {
      log('✅ Amount entered', 'green');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Select reason
    log('\n📝 Selecting reason...', 'cyan');
    const reasonSelected = await page.evaluate(() => {
      const select = document.querySelector('#reason-select, select');
      if (select) {
        select.value = 'Dinner/Meal';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    });
    
    if (!reasonSelected) {
      log('⚠️  Could not find reason select - please select a reason manually', 'yellow');
    } else {
      log('✅ Reason selected', 'green');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Continue to Payment
    log('\n➡️  Clicking "Continue to Payment"...', 'cyan');
    const continueClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Continue to Payment') || 
        b.textContent.includes('Send Money')
      );
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (!continueClicked) {
      log('⚠️  Could not click continue button - please click manually', 'yellow');
      log('   Waiting 30 seconds...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      log('✅ Clicked continue button', 'green');
    }
    
    // Wait for Stripe card form
    log('\n💳 Waiting for Stripe card form...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if Stripe Elements loaded
    const stripeFormExists = await page.evaluate(() => {
      return !!document.querySelector('#card-element, [data-testid="card-element"], iframe[src*="stripe"]');
    });
    
    if (!stripeFormExists) {
      log('⚠️  Stripe card form not found', 'yellow');
      log('   This might mean:', 'yellow');
      log('   - Payment intent creation failed', 'blue');
      log('   - Stripe Elements not loaded', 'blue');
      log('   - Check browser console for errors', 'blue');
      log('   Waiting 30 seconds for manual intervention...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      log('✅ Stripe card form found', 'green');
    }
    
    // Fill in card details using Stripe Elements iframe
    log('\n💳 Entering test card details...', 'cyan');
    log('   This may take a moment as Stripe Elements loads...', 'yellow');
    
    // Wait a bit more for iframe to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find and fill Stripe Elements iframe
    const frames = await page.frames();
    const stripeFrame = frames.find(frame => frame.url().includes('stripe') || frame.name().includes('stripe'));
    
    if (stripeFrame) {
      log('✅ Found Stripe iframe', 'green');
      
      try {
        // Try to fill card number
        await stripeFrame.waitForSelector('input[name="cardnumber"], input[placeholder*="Card number"]', { timeout: 5000 });
        await stripeFrame.type('input[name="cardnumber"], input[placeholder*="Card number"]', TEST_CARD.number, { delay: 50 });
        log('✅ Card number entered', 'green');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to fill expiry
        await stripeFrame.type('input[name="exp-date"], input[placeholder*="MM / YY"]', TEST_CARD.expiry, { delay: 50 });
        log('✅ Expiry entered', 'green');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to fill CVC
        await stripeFrame.type('input[name="cvc"], input[placeholder*="CVC"]', TEST_CARD.cvc, { delay: 50 });
        log('✅ CVC entered', 'green');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to fill ZIP
        const zipInput = await stripeFrame.$('input[name="postal"], input[placeholder*="ZIP"]').catch(() => null);
        if (zipInput) {
          await zipInput.type(TEST_CARD.zip, { delay: 50 });
          log('✅ ZIP entered', 'green');
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Click Pay button
        log('\n💳 Clicking Pay button...', 'cyan');
        const payClicked = await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent.includes('Pay') && 
            !b.disabled
          );
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });
        
        if (payClicked) {
          log('✅ Pay button clicked', 'green');
        } else {
          log('⚠️  Could not click Pay button - please click manually', 'yellow');
        }
        
        // Wait for payment processing
        log('\n⏳ Waiting for payment to process...', 'cyan');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for success
        const success = await page.evaluate(() => {
          const notification = document.querySelector('.notification, .toast, [role="alert"]');
          if (notification) {
            const text = notification.textContent;
            return text.includes('success') || text.includes('Successfully');
          }
          return false;
        });
        
        if (success) {
          log('✅ Payment processed successfully!', 'green');
        } else {
          log('⚠️  Checking payment status...', 'yellow');
          log('   Look for success notification or error message', 'blue');
        }
        
      } catch (error) {
        log(`⚠️  Error filling card form: ${error.message}`, 'yellow');
        log('   Please fill in card details manually:', 'yellow');
        log(`   Card: ${TEST_CARD.number}`, 'blue');
        log(`   Expiry: ${TEST_CARD.expiry}`, 'blue');
        log(`   CVC: ${TEST_CARD.cvc}`, 'blue');
        log(`   ZIP: ${TEST_CARD.zip}`, 'blue');
        log('   Waiting 60 seconds...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    } else {
      log('⚠️  Stripe iframe not found', 'yellow');
      log('   Please fill in card details manually:', 'yellow');
      log(`   Card: ${TEST_CARD.number}`, 'blue');
      log(`   Expiry: ${TEST_CARD.expiry}`, 'blue');
      log(`   CVC: ${TEST_CARD.cvc}`, 'blue');
      log(`   ZIP: ${TEST_CARD.zip}`, 'blue');
      log('   Waiting 60 seconds...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    log('\n📊 Test Summary', 'bold');
    log('='.repeat(60), 'cyan');
    log('✅ Browser automation test completed', 'green');
    log('⚠️  Some steps may require manual intervention', 'yellow');
    log('\n📝 Next Steps:', 'cyan');
    log('   1. Check browser for success notification', 'blue');
    log('   2. Check Stripe dashboard for payment', 'blue');
    log('   3. Verify payment intent was created', 'blue');
    
    log('\n⏳ Keeping browser open for 30 seconds for review...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    log('\n🔒 Closing browser...', 'cyan');
    await browser.close();
  }
  
  log('\n✅ Test complete!', 'green');
}

// Check if puppeteer is available
try {
  require.resolve('puppeteer');
  testFullStripeFlow().catch(error => {
    log(`\n❌ Test error: ${error.message}`, 'red');
    process.exit(1);
  });
} catch (error) {
  log('\n⚠️  Puppeteer not installed', 'yellow');
  log('   Installing puppeteer...', 'cyan');
  const { execSync } = require('child_process');
  try {
    execSync('npm install puppeteer --save-dev', { stdio: 'inherit' });
    log('✅ Puppeteer installed, running test...', 'green');
    testFullStripeFlow().catch(error => {
      log(`\n❌ Test error: ${error.message}`, 'red');
      process.exit(1);
    });
  } catch (installError) {
    log('❌ Failed to install puppeteer', 'red');
    log('   Install manually: npm install puppeteer --save-dev', 'yellow');
    process.exit(1);
  }
}

