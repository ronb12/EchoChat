const puppeteer = require('puppeteer');

async function checkConsoleErrors() {
  console.log('🔍 Checking EchoChat for console errors...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });

  try {
    console.log('📱 Navigating to EchoChat...');
    await page.goto('https://echochat-messaging.web.app', { waitUntil: 'networkidle0' });
    
    console.log('⏳ Waiting for app to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Checking for login modal...');
    const loginModal = await page.$('#login-modal');
    if (loginModal) {
      console.log('✅ Login modal found');
      
      // Try to login
      console.log('🔐 Attempting login...');
      await page.type('#email', 'testuser1@echochat.com');
      await page.type('#password', 'testpass123');
      await page.click('button[type="submit"]');
      
      console.log('⏳ Waiting for login to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('📊 Console Messages Found:');
    consoleMessages.forEach(msg => {
      const icon = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${msg.type.toUpperCase()}] ${msg.text}`);
    });
    
    const errorCount = consoleMessages.filter(msg => msg.type === 'error').length;
    const warningCount = consoleMessages.filter(msg => msg.type === 'warning').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Warnings: ${warningCount}`);
    console.log(`   Total Messages: ${consoleMessages.length}`);
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'https://echochat-messaging.web.app',
      consoleMessages,
      summary: {
        errors: errorCount,
        warnings: warningCount,
        total: consoleMessages.length
      }
    };
    
    require('fs').writeFileSync('console-errors-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Detailed report saved to console-errors-report.json');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

checkConsoleErrors();