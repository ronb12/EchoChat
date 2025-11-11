const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testAppDesign() {
  console.log('🚀 Starting EchoChat Design Analysis...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    console.log('📱 Navigating to EchoChat...');
    await page.goto('https://echochat-messaging.web.app', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for app to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ 
      path: 'screenshots/initial-load.png',
      fullPage: true 
    });

    // Check if login modal appears
    console.log('🔍 Checking for login modal...');
    const loginModal = await page.$('#login-modal');
    if (loginModal) {
      console.log('✅ Login modal found');
      await page.screenshot({ 
        path: 'screenshots/login-modal.png',
        fullPage: true 
      });

      // Test login functionality
      console.log('🔐 Testing login...');
      await page.type('#email', 'testuser1@echochat.com');
      await page.type('#password', 'testpass123');
      
      await page.screenshot({ 
        path: 'screenshots/login-form-filled.png',
        fullPage: true 
      });

      // Click login button
      const loginButton = await page.$('button[type="submit"]');
      if (loginButton) {
        await loginButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📸 Taking post-login screenshot...');
        await page.screenshot({ 
          path: 'screenshots/post-login.png',
          fullPage: true 
        });
      }
    }

    // Wait for app to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot of main app interface
    console.log('📸 Taking main app screenshot...');
    await page.screenshot({ 
      path: 'screenshots/main-app.png',
      fullPage: true 
    });

    // Test responsive design
    console.log('📱 Testing responsive design...');
    
    // Mobile view
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'screenshots/mobile-view.png',
      fullPage: true 
    });

    // Tablet view
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'screenshots/tablet-view.png',
      fullPage: true 
    });

    // Desktop view
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'screenshots/desktop-view.png',
      fullPage: true 
    });

    // Test UI interactions
    console.log('🎯 Testing UI interactions...');
    
    // Check for sidebar toggle
    const sidebarToggle = await page.$('#sidebar-toggle');
    if (sidebarToggle) {
      await sidebarToggle.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ 
        path: 'screenshots/sidebar-open.png',
        fullPage: true 
      });
    }

    // Check for settings modal
    const settingsButton = await page.$('#settings-btn');
    if (settingsButton) {
      await settingsButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ 
        path: 'screenshots/settings-modal.png',
        fullPage: true 
      });
      
      // Close settings modal
      const closeButton = await page.$('.modal-close');
      if (closeButton) {
        await closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Test new chat functionality
    const newChatButton = await page.$('#new-chat-btn');
    if (newChatButton) {
      await newChatButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ 
        path: 'screenshots/new-chat-modal.png',
        fullPage: true 
      });
      
      // Close new chat modal
      const closeButton = await page.$('.modal-close');
      if (closeButton) {
        await closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Analyze console errors
    console.log('🔍 Analyzing console errors...');
    const consoleLogs = await page.evaluate(() => {
      return window.consoleLogs || [];
    });

    // Check for any JavaScript errors
    const errors = await page.evaluate(() => {
      return window.errors || [];
    });

    console.log('📊 Design Analysis Complete!');
    console.log('📁 Screenshots saved to screenshots/ directory');
    
    // Generate analysis report
    const analysisReport = {
      timestamp: new Date().toISOString(),
      screenshots: [
        'initial-load.png',
        'login-modal.png', 
        'login-form-filled.png',
        'post-login.png',
        'main-app.png',
        'mobile-view.png',
        'tablet-view.png',
        'desktop-view.png',
        'sidebar-open.png',
        'settings-modal.png',
        'new-chat-modal.png'
      ],
      consoleErrors: errors,
      consoleLogs: consoleLogs,
      recommendations: []
    };

    // Save analysis report
    fs.writeFileSync('screenshots/analysis-report.json', JSON.stringify(analysisReport, null, 2));
    console.log('📋 Analysis report saved to screenshots/analysis-report.json');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

// Run the test
testAppDesign().catch(console.error);
