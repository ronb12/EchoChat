/**
 * Comprehensive automated test for EchoDynamo
 * Tests all features across different screen sizes
 */

import puppeteer from 'puppeteer';

const SCREEN_SIZES = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone XS Max': { width: 414, height: 896 },
  'iPad': { width: 768, height: 1024 },
  'Desktop': { width: 1920, height: 1080 }
};

const DELAY = 1000; // 1 second delay between actions

async function testViewport(browser, sizeName, dimensions, basePort = 3000) {
  console.log(`\n🧪 Testing ${sizeName} (${dimensions.width}x${dimensions.height})...`);
  
  // Create a new page for each test to avoid state issues
  const page = await browser.newPage();
  await page.setViewport(dimensions);
  
  const results = {
    viewport: sizeName,
    dimensions,
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // Navigate to app - use the detected basePort (reused for all tests)
    console.log('  📱 Navigating to app...');
    let connected = false;
    let lastError = null;
    
    // Try the detected port with multiple strategies
    // First attempt: quick domcontentloaded
    try {
      const response = await page.goto(`http://localhost:${basePort}`, { 
        waitUntil: 'domcontentloaded', 
        timeout: 12000 
      });
      if (response && response.ok()) {
        connected = true;
        console.log(`  ✓ Connected to server on port ${basePort}`);
        // Wait a bit for page to stabilize
        await new Promise(f => setTimeout(f, 500));
      }
    } catch (e) {
      lastError = e;
    }
    
    // If failed, retry with load event
    if (!connected) {
      try {
        const response = await page.goto(`http://localhost:${basePort}`, { 
          waitUntil: 'load', 
          timeout: 15000 
        });
        if (response && response.ok()) {
          connected = true;
          console.log(`  ✓ Connected to server on port ${basePort} (load event)`);
          await new Promise(f => setTimeout(f, 500));
        }
      } catch (e) {
        lastError = e;
      }
    }
    
    // Final attempt with networkidle
    if (!connected) {
      try {
        console.log(`  ⏳ Retrying connection to port ${basePort} with extended timeout...`);
        const response = await page.goto(`http://localhost:${basePort}`, { 
          waitUntil: 'networkidle0', 
          timeout: 25000 
        });
        if (response && response.ok()) {
          connected = true;
          console.log(`  ✓ Connected to server on port ${basePort} (networkidle)`);
        }
      } catch (e) {
        lastError = e;
      }
    }
    
    if (!connected) {
      // Final attempt - check if server is actually running
      const http = await import('http');
      const serverCheck = await new Promise((resolve) => {
        const req = http.request({ 
          hostname: 'localhost', 
          port: basePort, 
          method: 'HEAD', 
          timeout: 3000 
        }, (res) => {
          resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
      });
      
      if (!serverCheck) {
        throw new Error(`Server on port ${basePort} is not responding. Dev server may have stopped. Please restart: npm run dev`);
      }
      
      // Server is running but page navigation failed - try one more time with very long timeout
      console.log(`  🔄 Final retry with maximum timeout...`);
      try {
        const response = await page.goto(`http://localhost:${basePort}`, { 
          waitUntil: 'load', 
          timeout: 30000 
        });
        if (response && response.ok()) {
          connected = true;
          console.log(`  ✓ Connected on final retry`);
        }
      } catch (finalError) {
        throw new Error(`Could not connect to server on port ${basePort} after multiple attempts. Server appears to be running but navigation fails. Last error: ${finalError?.message || 'Unknown'}.`);
      }
    }
    await new Promise(f => setTimeout(f, DELAY));
    
    // Test 1: Landing page elements
    console.log('  ✓ Checking landing page...');
    const landingPage = await page.evaluate(() => {
      const hero = document.querySelector('.hero-section');
      const demoBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Try Demo') || btn.textContent.includes('Demo')
      );
      return { hasHero: !!hero, hasDemoBtn: !!demoBtn };
    });
    
    if (landingPage.hasHero && landingPage.hasDemoBtn) {
      results.passed.push('Landing page elements visible');
    } else {
      results.failed.push('Landing page elements missing');
    }
    
    // Click demo button
    console.log('  🔘 Clicking demo button...');
    await page.evaluate(() => {
      const demoBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Try Demo') || btn.textContent.includes('Demo')
      );
      if (demoBtn) demoBtn.click();
    });
    await new Promise(f => setTimeout(f, DELAY * 2));
    
    // Test 2: Sidebar visibility
    console.log('  ✓ Checking sidebar...');
    const sidebar = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      const newChatBtn = document.querySelector('button') && 
        Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('New Chat') || btn.textContent.includes('+')
        );
      return {
        exists: !!sidebar,
        visible: sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false,
        hasNewChatBtn: !!newChatBtn,
        width: sidebar ? sidebar.offsetWidth : 0
      };
    });
    
    if (sidebar.exists && sidebar.visible) {
      results.passed.push(`Sidebar visible (width: ${sidebar.width}px)`);
    } else {
      results.failed.push('Sidebar not visible');
    }
    
    // Test 3: Chat list
    console.log('  ✓ Checking chat list...');
    await new Promise(f => setTimeout(f, DELAY));
    const chatList = await page.evaluate(() => {
      const chatItems = document.querySelectorAll('.chat-item');
      return {
        count: chatItems.length,
        visible: chatItems.length > 0 && Array.from(chatItems).some(item => 
          window.getComputedStyle(item).display !== 'none'
        )
      };
    });
    
    if (chatList.count > 0) {
      results.passed.push(`Chat list has ${chatList.count} items`);
    } else {
      results.warnings.push('Chat list is empty (might be expected)');
    }
    
    // Click first chat if available
    console.log('  🔘 Opening first chat...');
    await page.evaluate(() => {
      const firstChat = document.querySelector('.chat-item');
      if (firstChat) firstChat.click();
    });
    await new Promise(f => setTimeout(f, DELAY * 2));
    
    // Test 4: Chat header
    console.log('  ✓ Checking chat header...');
    const chatHeader = await page.evaluate(() => {
      const header = document.querySelector('.chat-header');
      const chatName = header ? header.querySelector('h3') : null;
      const actionBtns = header ? header.querySelectorAll('.action-btn') : [];
      return {
        exists: !!header,
        hasName: !!chatName && chatName.textContent.trim().length > 0,
        actionBtnCount: actionBtns.length,
        allVisible: header ? window.getComputedStyle(header).display !== 'none' : false
      };
    });
    
    if (chatHeader.exists && chatHeader.hasName) {
      results.passed.push(`Chat header visible with ${chatHeader.actionBtnCount} action buttons`);
    } else {
      results.failed.push('Chat header missing or incomplete');
    }
    
    // Test 5: Message input area
    console.log('  ✓ Checking message input...');
    const messageInput = await page.evaluate(() => {
      const input = document.getElementById('message-input');
      const container = document.querySelector('.message-input-container');
      const wrapper = document.querySelector('.message-input-wrapper');
      
      if (!input || !container) return null;
      
      const inputStyles = window.getComputedStyle(input);
      const containerStyles = window.getComputedStyle(container);
      const inputRect = input.getBoundingClientRect();
      
      return {
        exists: true,
        visible: inputStyles.display !== 'none' && 
                 inputStyles.visibility !== 'hidden' &&
                 inputStyles.opacity !== '0',
        width: input.offsetWidth,
        height: input.offsetHeight,
        inViewport: inputRect.top >= 0 && inputRect.bottom <= window.innerHeight,
        containerVisible: containerStyles.display !== 'none',
        containerPosition: containerStyles.position,
        containerBottom: containerStyles.bottom,
        hasWrapper: !!wrapper
      };
    });
    
    if (messageInput && messageInput.exists && messageInput.visible) {
      if (messageInput.width > 0 && messageInput.height > 0) {
        results.passed.push(`Message input visible (${messageInput.width}x${messageInput.height}px)`);
        if (!messageInput.inViewport) {
          results.warnings.push('Message input exists but may be outside viewport');
        }
      } else {
        results.failed.push('Message input has zero dimensions');
      }
    } else {
      results.failed.push('Message input not found or not visible');
    }
    
    // Test 6: Action buttons (attachment, emoji, mic, money)
    console.log('  ✓ Checking action buttons...');
    const actionButtons = await page.evaluate(() => {
      const actionsContainer = document.querySelector('.input-actions');
      const buttons = actionsContainer ? Array.from(actionsContainer.querySelectorAll('button')) : [];
      
      const attachmentBtn = buttons.find(btn => 
        btn.textContent.includes('📎') || btn.getAttribute('aria-label')?.includes('attach')
      );
      const emojiBtn = buttons.find(btn => 
        btn.textContent.includes('😀') || btn.textContent.includes('😊')
      );
      const micBtn = buttons.find(btn => 
        btn.textContent.includes('🎤') || btn.getAttribute('aria-label')?.includes('voice')
      );
      const moneyBtn = buttons.find(btn => 
        btn.textContent.includes('💵') || btn.getAttribute('aria-label')?.includes('money')
      );
      
      return {
        containerExists: !!actionsContainer,
        containerVisible: actionsContainer ? 
          window.getComputedStyle(actionsContainer).display !== 'none' : false,
        buttonCount: buttons.length,
        attachment: !!attachmentBtn,
        emoji: !!emojiBtn,
        mic: !!micBtn,
        money: !!moneyBtn,
        allButtons: buttons.map(btn => ({
          text: btn.textContent.trim(),
          visible: window.getComputedStyle(btn).display !== 'none',
          size: { width: btn.offsetWidth, height: btn.offsetHeight }
        }))
      };
    });
    
    if (actionButtons.containerExists && actionButtons.containerVisible) {
      const foundButtons = [
        actionButtons.attachment && 'attachment',
        actionButtons.emoji && 'emoji',
        actionButtons.mic && 'mic',
        actionButtons.money && 'money'
      ].filter(Boolean);
      
      results.passed.push(`Action buttons container visible with ${actionButtons.buttonCount} buttons (${foundButtons.join(', ')})`);
      
      if (!actionButtons.attachment) results.warnings.push('Attachment button not found');
      if (!actionButtons.emoji) results.warnings.push('Emoji button not found');
      if (!actionButtons.mic) results.warnings.push('Mic button not found');
      if (!actionButtons.money) results.warnings.push('Money button not found');
    } else {
      results.failed.push('Action buttons container not visible');
    }
    
    // Test 7: Send button
    console.log('  ✓ Checking send button...');
    const sendButton = await page.evaluate(() => {
      const sendBtn = document.querySelector('.send-btn');
      return {
        exists: !!sendBtn,
        visible: sendBtn ? window.getComputedStyle(sendBtn).display !== 'none' : false,
        size: sendBtn ? { width: sendBtn.offsetWidth, height: sendBtn.offsetHeight } : null
      };
    });
    
    if (sendButton.exists && sendButton.visible) {
      results.passed.push('Send button visible');
    } else {
      results.failed.push('Send button not found');
    }
    
    // Test 8: Header avatar and menu
    console.log('  ✓ Checking app header...');
    const appHeader = await page.evaluate(() => {
      const header = document.querySelector('.app-header');
      const avatar = header ? header.querySelector('.avatar-menu-container, .avatar-button, img[alt*="User"]') : null;
      const menuToggle = document.querySelector('.menu-toggle');
      
      return {
        exists: !!header,
        hasAvatar: !!avatar,
        hasMenuToggle: !!menuToggle && window.getComputedStyle(menuToggle).display !== 'none',
        headerVisible: header ? window.getComputedStyle(header).display !== 'none' : false
      };
    });
    
    if (appHeader.exists && appHeader.headerVisible) {
      results.passed.push('App header visible');
      if (appHeader.hasAvatar) {
        results.passed.push('User avatar visible');
      } else {
        results.warnings.push('User avatar not found');
      }
    } else {
      results.failed.push('App header not visible');
    }
    
    // Test 9: Messages container
    console.log('  ✓ Checking messages container...');
    const messagesContainer = await page.evaluate(() => {
      const container = document.querySelector('.messages-container');
      const messages = container ? container.querySelectorAll('.message') : [];
      
      return {
        exists: !!container,
        visible: container ? window.getComputedStyle(container).display !== 'none' : false,
        messageCount: messages.length,
        scrollable: container ? {
          overflowY: window.getComputedStyle(container).overflowY,
          maxHeight: window.getComputedStyle(container).maxHeight
        } : null
      };
    });
    
    if (messagesContainer.exists && messagesContainer.visible) {
      results.passed.push(`Messages container visible with ${messagesContainer.messageCount} messages`);
    } else {
      results.warnings.push('Messages container not found (might be empty chat)');
    }
    
    // Test 10: Responsive design check
    console.log('  ✓ Checking responsive design...');
    const responsiveCheck = await page.evaluate((width) => {
      const htmlFontSize = window.getComputedStyle(document.documentElement).fontSize;
      const sidebar = document.querySelector('.sidebar');
      const input = document.getElementById('message-input');
      
      return {
        htmlFontSize,
        sidebarWidth: sidebar ? {
          computed: window.getComputedStyle(sidebar).width,
          actual: sidebar.offsetWidth,
          minWidth: window.getComputedStyle(sidebar).minWidth,
          maxWidth: window.getComputedStyle(sidebar).maxWidth
        } : null,
        inputFontSize: input ? window.getComputedStyle(input).fontSize : null,
        inputMinWidth: input ? window.getComputedStyle(input).minWidth : null,
        isResponsive: {
          usesClamp: sidebar ? window.getComputedStyle(sidebar).width.includes('clamp') || 
                              window.getComputedStyle(sidebar).width.includes('vw') : false,
          fluidTypography: htmlFontSize !== '16px'
        }
      };
    }, dimensions.width);
    
    if (responsiveCheck.isResponsive.usesClamp || responsiveCheck.isResponsive.fluidTypography) {
      results.passed.push('Responsive design detected (fluid units in use)');
    } else {
      results.warnings.push('Responsive design may not be fully applied');
    }
    
    results.passed.push(`HTML font size: ${responsiveCheck.htmlFontSize}`);
    if (responsiveCheck.sidebarWidth) {
      results.passed.push(`Sidebar width: ${responsiveCheck.sidebarWidth.computed}`);
    }
    
    // Test 11: Dark/Light mode support
    console.log('  ✓ Checking theme support...');
    const themeSupport = await page.evaluate(() => {
      const html = document.documentElement;
      const hasDataTheme = html.hasAttribute('data-theme');
      const theme = hasDataTheme ? html.getAttribute('data-theme') : null;
      
      return {
        supportsTheme: hasDataTheme,
        currentTheme: theme || 'default',
        hasThemeToggle: !!document.querySelector('[data-theme-toggle]') || 
                       !!document.querySelector('button[aria-label*="theme"]') ||
                       !!document.querySelector('button[aria-label*="dark"]') ||
                       !!document.querySelector('button[aria-label*="light"]')
      };
    });
    
    if (themeSupport.supportsTheme) {
      results.passed.push(`Theme support enabled (current: ${themeSupport.currentTheme})`);
    } else {
      results.warnings.push('Theme attribute not found');
    }
    
    await page.close();
    return results;
    
  } catch (error) {
    results.failed.push(`Test error: ${error.message}`);
    await page.close();
    return results;
  }
}

async function findAvailablePort() {
  // Use Node's http module to check ports synchronously
  const http = await import('http');
  const testPorts = [3000, 5173, 3001, 3002, 3003, 3004];
  
  for (const port of testPorts) {
    try {
      const isAvailable = await new Promise((resolve) => {
        const req = http.request({ 
          hostname: 'localhost', 
          port: port, 
          method: 'HEAD',
          timeout: 2000
        }, (res) => {
          resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
      });
      
      if (isAvailable) {
        return port;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function runTests() {
  console.log('🚀 Starting comprehensive view tests for EchoDynamo...\n');
  
  // Find available port first - this port will be reused for all tests
  console.log('🔍 Detecting dev server port...');
  let basePort = await findAvailablePort();
  
  if (!basePort) {
    console.error('❌ Could not find dev server on any common port (3000-3004, 5173)');
    console.error('   Please make sure the dev server is running: npm run dev');
    process.exit(1);
  }
  
  console.log(`✓ Dev server found on port ${basePort}\n`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const allResults = [];
    
    // Test each viewport size sequentially with new pages
    for (const [sizeName, dimensions] of Object.entries(SCREEN_SIZES)) {
      console.log(`\n⏳ Starting test for ${sizeName}...`);
      
      const results = await testViewport(browser, sizeName, dimensions, basePort);
      allResults.push(results);
      
      // Delay between tests to ensure proper cleanup and avoid port exhaustion
      // Also verify server is still accessible before next test
      await new Promise(f => setTimeout(f, 3000));
      
      // Quick health check on the server before next test
      if (sizeName !== 'Desktop') {
        try {
          const http = await import('http');
          await new Promise((resolve, reject) => {
            const req = http.request({ hostname: 'localhost', port: basePort, method: 'HEAD', timeout: 2000 }, () => {
              resolve();
            });
            req.on('error', () => resolve()); // Continue even if check fails
            req.on('timeout', () => { req.destroy(); resolve(); });
            req.end();
          });
        } catch (e) {
          // Ignore health check errors
        }
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    
    allResults.forEach(result => {
      console.log(`\n${result.viewport} (${result.dimensions.width}x${result.dimensions.height}):`);
      console.log(`  ✅ Passed: ${result.passed.length}`);
      result.passed.forEach(test => console.log(`    ✓ ${test}`));
      
      if (result.warnings.length > 0) {
        console.log(`  ⚠️  Warnings: ${result.warnings.length}`);
        result.warnings.forEach(warning => console.log(`    ⚠ ${warning}`));
      }
      
      if (result.failed.length > 0) {
        console.log(`  ❌ Failed: ${result.failed.length}`);
        result.failed.forEach(failure => console.log(`    ✗ ${failure}`));
      }
    });
    
    // Overall statistics
    const totalPassed = allResults.reduce((sum, r) => sum + r.passed.length, 0);
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed.length, 0);
    const totalWarnings = allResults.reduce((sum, r) => sum + r.warnings.length, 0);
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 OVERALL STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Tests Passed: ${totalPassed}`);
    console.log(`Total Tests Failed: ${totalFailed}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Viewports Tested: ${allResults.length}`);
    
    if (totalFailed === 0) {
      console.log('\n✅ All critical tests passed!');
    } else {
      console.log(`\n❌ ${totalFailed} test(s) failed. Please review the results above.`);
    }
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run tests
runTests().catch(console.error);

