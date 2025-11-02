const puppeteer = require('puppeteer');

async function createTestUsers() {
  console.log('🔧 Creating test users...');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://echochat-messaging.web.app');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Click login button
    const loginButton = await page.$('.btn-primary');
    if (loginButton) {
      await loginButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Switch to sign up tab
    const signUpTab = await page.$('[data-tab="signup"]');
    if (signUpTab) {
      await signUpTab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Create first test user
    console.log('Creating testuser1@echochat.com...');
    await page.type('#email', 'testuser1@echochat.com');
    await page.type('#password', 'testpass123');
    await page.type('#displayName', 'Test User 1');
    await page.click('button[type="submit"]');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Test users created successfully');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  } finally {
    await browser.close();
  }
}

createTestUsers();