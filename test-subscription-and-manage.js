const puppeteer = require('puppeteer');

const DELAY = 2000; // 2 seconds between actions
const BASE_PORT = 5173;
const API_BASE_URL = 'http://localhost:3001';

// Helper to find running dev server port
async function findRunningDevServer() {
  const http = require('http');
  // Use port 3002 directly
  return 3002;
  const commonPorts = [3002, 5173, 3000, 3001, 3003, 3004, 5174, 5175];
  
  for (const port of commonPorts) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          req.abort();
          resolve(port);
        });
        req.on('error', () => reject());
        req.setTimeout(1000, () => {
          req.abort();
          reject();
        });
      });
      return port;
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function waitForServer(port, maxRetries = 10) {
  const http = require('http');
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(2000, () => reject(new Error('Timeout')));
      });
      return true;
    } catch (e) {
      if (i < maxRetries - 1) {
        console.log(`   Waiting for server... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

async function loginAsBusinessUser(page, basePort) {
  console.log('📝 Logging in as business user...');
  
  // Wait for server to be ready
  console.log('   Waiting for dev server...');
  const serverReady = await waitForServer(basePort);
  if (!serverReady) {
    throw new Error(`Server not ready on port ${basePort}`);
  }
  console.log('   ✅ Server is ready');
  
  // Navigate to app
  await page.goto(`http://localhost:${basePort}`, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });

  // Wait for landing page
  await page.waitForSelector('button', { timeout: 10000 });
  
  // Click demo/login button
  const demoButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent.includes('Demo') || 
      btn.textContent.includes('Login') ||
      btn.textContent.includes('Get Started')
    );
  });

  if (demoButton) {
    await demoButton.click();
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }

  // Wait for login modal
  await page.waitForSelector('[class*="modal"]', { timeout: 10000 });
  
  // Set business account type in localStorage
  await page.evaluate(() => {
    localStorage.setItem('echochat_account_type', 'business');
    localStorage.setItem('selected_account_type', 'business');
  });

  // Click on Test Business Account button
  const businessButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent.includes('Business') ||
      btn.textContent.includes('Test Business')
    );
  });

  if (businessButton) {
    await businessButton.click();
    await new Promise(resolve => setTimeout(resolve, DELAY * 2));
  } else {
    // Fallback: use page.evaluate to click
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Business') || b.textContent.includes('business'));
      if (btn) btn.click();
    });
    await new Promise(resolve => setTimeout(resolve, DELAY * 2));
  }

  // Verify logged in
  await page.waitForSelector('.user-avatar, [class*="avatar"]', { timeout: 10000 });
  console.log('✅ Logged in as business user');
}

async function openSettingsModal(page) {
  console.log('⚙️ Opening Settings Modal...');
  
  // Find and click avatar
  const avatar = await page.evaluateHandle(() => {
    const avatars = Array.from(document.querySelectorAll('[class*="avatar"], .user-avatar'));
    return avatars[0];
  });

  if (avatar) {
    await avatar.click();
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }

  // Wait for avatar dropdown
  await new Promise(resolve => setTimeout(resolve, DELAY));

  // Click Settings in dropdown
  const settingsButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button, div[class*="menu-item"], div[class*="dropdown"]'));
    return buttons.find(btn => 
      btn.textContent.includes('Settings') ||
      btn.textContent.includes('⚙️')
    );
  });

  if (settingsButton) {
    await settingsButton.click();
    await new Promise(resolve => setTimeout(resolve, DELAY * 2));
  } else {
    // Try direct click via evaluate
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('*'));
      const settingsItem = items.find(el => 
        el.textContent && el.textContent.includes('Settings')
      );
      if (settingsItem) {
        settingsItem.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, DELAY * 2));
  }

  // Wait for settings modal - try multiple selectors
  try {
    await page.waitForSelector('.modal.active, .modal, [class*="modal-content"], [class*="settings-modal"]', { timeout: 15000 });
    console.log('✅ Settings modal opened');
  } catch (e) {
    // Try to verify modal is visible via evaluate
    const modalVisible = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('[class*="modal"], .modal'));
      return modals.some(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    });
    
    if (modalVisible) {
      console.log('✅ Settings modal opened (verified via evaluate)');
    } else {
      console.log('⚠️  Settings modal may not be visible');
      // Take screenshot for debugging
      await page.screenshot({ path: 'settings-modal-debug.png' });
    }
  }
}

async function testSubscriptionFeatures(page) {
  console.log('\n📊 Testing Subscription Features...');
  
  const results = {
    subscriptionSection: false,
    subscriptionStatus: false,
    trialCountdown: false,
    subscribeButton: false,
    cancelButton: false,
    amount: false
  };

  try {
    // Scroll to Business Settings section
    console.log('   Scrolling to Business Settings...');
    await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('*'));
      const businessSection = sections.find(el => 
        el.textContent && (
          el.textContent.includes('Business Settings') ||
          el.textContent.includes('🏢 Business') ||
          el.textContent.includes('Business Subscription')
        )
      );
      if (businessSection) {
        businessSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await new Promise(resolve => setTimeout(resolve, DELAY * 2));
    // Check for subscription section - more robust search
    const subscriptionSection = await page.evaluate(() => {
      // First try to find by text content
      const allElements = Array.from(document.querySelectorAll('*'));
      let found = allElements.find(el => {
        const text = el.textContent || '';
        return (
          text.includes('Business Subscription') ||
          (text.includes('💳') && text.includes('Business')) ||
          (text.includes('Subscription') && text.includes('$30'))
        );
      });
      
      // If not found, try to find by looking for Business Settings section
      if (!found) {
        found = allElements.find(el => {
          const text = el.textContent || '';
          return text.includes('🏢 Business Settings');
        });
      }
      
      return found;
    });

    if (subscriptionSection) {
      results.subscriptionSection = true;
      console.log('✅ Subscription section found');
    } else {
      console.log('❌ Subscription section not found');
    }

    // Check for subscription status
    const subscriptionStatus = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => {
        const text = el.textContent || '';
        return (
          text.includes('trialing') ||
          text.includes('Free Trial') ||
          text.includes('Active') ||
          text.includes('Status:')
        );
      });
    });

    if (subscriptionStatus) {
      results.subscriptionStatus = true;
      console.log('✅ Subscription status displayed');
    } else {
      console.log('❌ Subscription status not found');
    }

    // Check for trial countdown
    const trialCountdown = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => {
        const text = el.textContent || '';
        return (
          text.includes('Trial ends') ||
          text.includes('days remaining') ||
          text.includes('⏰')
        );
      });
    });

    if (trialCountdown) {
      results.trialCountdown = true;
      console.log('✅ Trial countdown displayed');
    } else {
      console.log('❌ Trial countdown not found');
    }

    // Check for $30/month amount
    const amount = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => {
        const text = el.textContent || '';
        return (
          text.includes('$30') ||
          text.includes('30.00') ||
          text.includes('$30.00')
        );
      });
    });

    if (amount) {
      results.amount = true;
      console.log('✅ Subscription amount ($30/month) displayed');
    } else {
      console.log('❌ Subscription amount not found');
    }

    // Check for cancel button (if subscription exists)
    const cancelButtonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent || '';
        return (
          text.includes('Cancel Subscription') ||
          (text.includes('Cancel') && text.includes('Subscription'))
        );
      });
    });

    if (cancelButtonHandle && cancelButtonHandle.asElement()) {
      results.cancelButton = true;
      console.log('✅ Cancel subscription button found');
      
      // Test clicking cancel button (but don't confirm)
      console.log('   Testing cancel button click...');
      const cancelButton = await cancelButtonHandle.asElement();
      if (cancelButton) {
        await cancelButton.click();
        await new Promise(resolve => setTimeout(resolve, DELAY));
        
        // Cancel the confirmation by pressing Escape
        await page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    } else {
      console.log('⚠️  Cancel button not found (may not have subscription yet)');
    }

    // Check for subscribe button (if no subscription)
    const subscribeButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent.includes('Subscribe') ||
        btn.textContent.includes('7-day free trial')
      );
    });

    if (subscribeButton) {
      results.subscribeButton = true;
      console.log('✅ Subscribe button found');
    } else {
      console.log('⚠️  Subscribe button not found (may already have subscription)');
    }

  } catch (error) {
    console.error('❌ Error testing subscription features:', error.message);
  }

  return results;
}

async function testManageButton(page) {
  console.log('\n⚙️ Testing Manage Button...');
  
  const results = {
    manageButton: false,
    manageButtonClickable: false,
    testAccountHandling: false
  };

  try {
    // Scroll to Balance & Payments section
    await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('*'));
      const balanceSection = sections.find(el => 
        el.textContent && (
          el.textContent.includes('Balance') ||
          el.textContent.includes('Payments')
        )
      );
      if (balanceSection) {
        balanceSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await new Promise(resolve => setTimeout(resolve, DELAY));

    // Find Manage button
    const manageButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent.includes('Manage') ||
        btn.textContent.includes('⚙️')
      );
    });

    if (manageButton) {
      results.manageButton = true;
      console.log('✅ Manage button found');

      // Check if button is enabled
      const isEnabled = await page.evaluate((btn) => {
        return !btn.disabled && !btn.hasAttribute('disabled');
      }, manageButton);

      if (isEnabled) {
        results.manageButtonClickable = true;
        console.log('✅ Manage button is clickable');

        // Click the button
        console.log('   Clicking Manage button...');
        
        // Set up console message listener for notifications
        const consoleMessages = [];
        page.on('console', msg => {
          if (msg.text().includes('Manage') || msg.text().includes('test account')) {
            consoleMessages.push(msg.text());
          }
        });

        await manageButton.click();
        await new Promise(resolve => setTimeout(resolve, DELAY * 2));

        // Check for notification (test account should show info message)
        const notification = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const notif = elements.find(el => {
            const text = el.textContent || '';
            return (
              text.includes('test account') ||
              text.includes('production accounts') ||
              text.includes('Stripe Connect')
            );
          });
          return notif ? notif.textContent : null;
        });

        if (notification) {
          results.testAccountHandling = true;
          console.log('✅ Test account handled correctly:', notification.substring(0, 50));
        } else {
          console.log('⚠️  Notification not found (may be real account)');
        }
      } else {
        console.log('⚠️  Manage button is disabled');
      }
    } else {
      console.log('❌ Manage button not found');
    }

  } catch (error) {
    console.error('❌ Error testing Manage button:', error.message);
  }

  return results;
}

async function runTests() {
  console.log('🧪 Starting Subscription and Manage Button Tests...\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Find running dev server
    const basePort = await findRunningDevServer();
    if (!basePort) {
      throw new Error('Could not find running dev server. Please start it with: npm run dev');
    }
    console.log(`📍 Found dev server on port: ${basePort}\n`);

    // Login as business user
    await loginAsBusinessUser(page, basePort);
    await new Promise(resolve => setTimeout(resolve, DELAY));

    // Open settings modal
    await openSettingsModal(page);
    await new Promise(resolve => setTimeout(resolve, DELAY));

    // Test subscription features
    const subscriptionResults = await testSubscriptionFeatures(page);
    await new Promise(resolve => setTimeout(resolve, DELAY));

    // Test Manage button
    const manageResults = await testManageButton(page);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n📋 Subscription Features:');
    console.log(`  Subscription Section: ${subscriptionResults.subscriptionSection ? '✅' : '❌'}`);
    console.log(`  Subscription Status: ${subscriptionResults.subscriptionStatus ? '✅' : '❌'}`);
    console.log(`  Trial Countdown: ${subscriptionResults.trialCountdown ? '✅' : '❌'}`);
    console.log(`  Amount ($30/month): ${subscriptionResults.amount ? '✅' : '❌'}`);
    console.log(`  Cancel Button: ${subscriptionResults.cancelButton ? '✅' : '⚠️'}`);
    console.log(`  Subscribe Button: ${subscriptionResults.subscribeButton ? '✅' : '⚠️'}`);

    console.log('\n⚙️ Manage Button:');
    console.log(`  Manage Button Found: ${manageResults.manageButton ? '✅' : '❌'}`);
    console.log(`  Manage Button Clickable: ${manageResults.manageButtonClickable ? '✅' : '❌'}`);
    console.log(`  Test Account Handling: ${manageResults.testAccountHandling ? '✅' : '⚠️'}`);

    const totalTests = Object.values(subscriptionResults).length + Object.values(manageResults).length;
    const passedTests = 
      Object.values(subscriptionResults).filter(r => r).length +
      Object.values(manageResults).filter(r => r).length;

    console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);

    // Keep browser open for manual inspection
    console.log('\n⏸️  Keeping browser open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test failed:', error);
    try {
      const page = await browser.pages()[0];
      if (page) {
        await page.screenshot({ path: 'test-subscription-error.png' });
      }
    } catch (screenshotError) {
      console.error('Could not take screenshot:', screenshotError.message);
    }
  } finally {
    await browser.close();
  }
}

// Run tests
runTests().catch(console.error);

