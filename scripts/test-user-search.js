/**
 * Test script to verify user search functionality
 * Tests searching for users by email: ronellbradley@gmail.com and ronellbradley@bradleyvs.com
 */

const puppeteer = require('puppeteer');

const TEST_EMAILS = [
  'ronellbradley@gmail.com',
  'ronellbradley@bradleyvs.com'
];

const FRONTEND_URLS = [
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://echochat-messaging.web.app'
];

async function findFrontendServer() {
  const fetch = (await import('node-fetch')).default;
  
  for (const url of FRONTEND_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Found frontend server at: ${url}`);
        return url;
      }
    } catch (error) {
      // Continue to next URL
    }
  }
  
  return null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testUserSearch() {
  console.log('🧪 Starting user search test...\n');
  
  const frontendUrl = await findFrontendServer();
  if (!frontendUrl) {
    console.error('❌ No frontend server found. Please start the frontend server.');
    console.log('   Try: npm run dev');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    console.log(`📱 Navigating to: ${frontendUrl}`);
    await page.goto(frontendUrl, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Check if user is logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="chat-area"]') ||
             !!document.querySelector('.chat-area') ||
             !!document.querySelector('.sidebar') ||
             !document.querySelector('[data-testid="login-modal"]');
    });

    if (!isLoggedIn) {
      console.log('⚠️  Not logged in. Please log in manually to test search.');
      console.log('   After logging in, the test will continue...\n');
      
      // Wait for user to log in (check every 2 seconds)
      let attempts = 0;
      while (attempts < 30) {
        await sleep(2000);
        const nowLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('[data-testid="chat-area"]') ||
                 !!document.querySelector('.chat-area') ||
                 !!document.querySelector('.sidebar');
        });
        
        if (nowLoggedIn) {
          console.log('✅ User logged in! Continuing test...\n');
          break;
        }
        attempts++;
      }
      
      if (attempts >= 30) {
        console.error('❌ Timeout waiting for login. Please log in and run the test again.');
        await browser.close();
        process.exit(1);
      }
    }

    // Open new chat modal
    console.log('🔍 Opening New Chat modal...');
    const newChatButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('new chat') || text.includes('start chat') || 
               text.includes('+') || btn.getAttribute('data-testid') === 'new-chat-button';
      });
    });

    if (newChatButton && newChatButton.asElement()) {
      await newChatButton.asElement().click();
      await sleep(1000);
    } else {
      // Try clicking by class or data attribute
      await page.click('button[data-testid="new-chat-button"], .new-chat-button, button:has-text("New Chat")').catch(() => {});
      await sleep(1000);
    }

    // Test searching for each email
    for (const email of TEST_EMAILS) {
      console.log(`\n🔍 Testing search for: ${email}`);
      
      // Find and clear search input
      await page.evaluate((emailToSearch) => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"]'));
        const searchInput = inputs.find(input => {
          const placeholder = input.placeholder?.toLowerCase() || '';
          return placeholder.includes('username') || placeholder.includes('email') || 
                 placeholder.includes('search') || input.id.includes('search');
        });
        
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
          searchInput.value = emailToSearch;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, email);

      await sleep(500);

      // Click search button
      const searchButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('search') && !text.includes('clear');
        });
      });

      if (searchButton && searchButton.asElement()) {
        await searchButton.asElement().click();
        console.log('✅ Clicked search button');
      } else {
        // Try pressing Enter
        await page.keyboard.press('Enter');
        console.log('✅ Pressed Enter to search');
      }

      await sleep(3000);

      // Check if user was found
      const searchResult = await page.evaluate((searchEmail) => {
        // Check for user found in the results
        const userElements = Array.from(document.querySelectorAll('.user-item, .chat-item, [data-testid="user-item"]'));
        const foundUser = userElements.find(el => {
          const text = el.textContent || '';
          return text.toLowerCase().includes(searchEmail.toLowerCase()) ||
                 text.toLowerCase().includes('send contact request') ||
                 text.toLowerCase().includes('start chat');
        });

        // Check for error message
        const errorMsg = document.querySelector('.error, .warning, [role="alert"]');
        const errorText = errorMsg?.textContent || '';

        // Check console logs (this won't work, but we can check the UI)
        return {
          found: !!foundUser,
          errorShown: errorText.toLowerCase().includes('not found') || errorText.toLowerCase().includes('user not found'),
          userElementText: foundUser?.textContent || '',
          errorText: errorText
        };
      }, email);

      if (searchResult.found) {
        console.log(`✅ User found: ${email}`);
        console.log(`   User element: ${searchResult.userElementText.substring(0, 50)}...`);
      } else if (searchResult.errorShown) {
        console.log(`❌ User not found: ${email}`);
        console.log(`   Error: ${searchResult.errorText}`);
      } else {
        console.log(`⚠️  Search result unclear for: ${email}`);
        console.log(`   Found element: ${searchResult.found}`);
        console.log(`   Error shown: ${searchResult.errorShown}`);
      }

      // Take screenshot for debugging
      await page.screenshot({ path: `test-search-${email.replace('@', '_at_')}.png` });
      console.log(`   Screenshot saved: test-search-${email.replace('@', '_at_')}.png`);
    }

    console.log('\n✅ Test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Check the screenshots to see the search results');
    console.log('   - Check browser console for detailed search logs');
    console.log('   - If users are found, they should be able to send contact requests');

    // Keep browser open for 5 seconds to view results
    await sleep(5000);

  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'test-error.png' });
    console.log('   Error screenshot saved: test-error.png');
  } finally {
    await browser.close();
  }
}

testUserSearch().catch(console.error);

