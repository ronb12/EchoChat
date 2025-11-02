const puppeteer = require('puppeteer');

async function checkAppState() {
  console.log('🔍 Checking EchoChat App State...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  const page = await browser.newPage();
  
  try {
    console.log('📱 Navigating to EchoChat...');
    await page.goto('https://echochat-messaging.web.app');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check what's visible
    const landingPage = await page.$('.landing-page');
    const loginModal = await page.$('#login-modal');
    const chatInterface = await page.$('.chat-area');
    const loginButton = await page.$('.btn-primary');
    
    console.log('Landing page:', !!landingPage);
    console.log('Login modal:', !!loginModal);
    console.log('Chat interface:', !!chatInterface);
    console.log('Login button:', !!loginButton);
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Take screenshot
    await page.screenshot({ path: 'current-app-state.png' });
    console.log('Screenshot saved as current-app-state.png');
    
    // Try clicking login button if it exists
    if (loginButton) {
      console.log('🔐 Clicking login button...');
      await loginButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const loginModalAfter = await page.$('#login-modal');
      console.log('Login modal after click:', !!loginModalAfter);
    }
    
  } finally {
    await browser.close();
  }
}

checkAppState();

