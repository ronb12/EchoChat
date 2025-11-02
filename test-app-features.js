/**
 * Comprehensive App Feature Test
 * Tests all major features of EchoChat
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class AppFeatureTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  async init() {
    console.log('🚀 Starting EchoChat Feature Tests...');
    this.browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Testing: ${testName}`);
    this.testResults.summary.total++;
    
    try {
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.tests.push({
        name: testName,
        status: 'PASSED',
        timestamp: new Date().toISOString()
      });
      this.testResults.summary.passed++;
    } catch (error) {
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      this.testResults.tests.push({
        name: testName,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      this.testResults.summary.failed++;
    }
  }

  async testAppLoad() {
    console.log('Navigating to localhost:3000...');
    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('Page loaded, waiting for landing page...');
    await this.page.waitForSelector('.landing-page', { timeout: 15000 });
    
    // Check if landing page loads
    const landingPage = await this.page.$('.landing-page');
    if (!landingPage) throw new Error('Landing page not found');
    
    // Check for main elements
    const title = await this.page.$eval('h1', el => el.textContent);
    if (!title.includes('EchoChat')) throw new Error('App title not found');
  }

  async testAuthentication() {
    // Test login modal
    const loginBtn = await this.page.$('.login-btn');
    if (!loginBtn) throw new Error('Login button not found');
    
    await loginBtn.click();
    await this.page.waitForSelector('.login-modal', { timeout: 5000 });
    
    // Check login form elements
    const emailInput = await this.page.$('input[type="email"]');
    const passwordInput = await this.page.$('input[type="password"]');
    const submitBtn = await this.page.$('.login-submit');
    
    if (!emailInput || !passwordInput || !submitBtn) {
      throw new Error('Login form elements not found');
    }
    
    // Close modal
    const closeBtn = await this.page.$('.modal-close');
    if (closeBtn) await closeBtn.click();
  }

  async testHeaderFeatures() {
    // Wait for header to load (after login)
    await this.page.waitForSelector('.app-header', { timeout: 10000 });
    
    // Test EchoChat title visibility
    const title = await this.page.$eval('.app-title h1', el => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight
      };
    });
    
    if (title.color !== 'rgb(255, 255, 255)') {
      throw new Error('EchoChat title not white');
    }
    
    // Test theme toggle button with label
    const themeBtn = await this.page.$('.theme-toggle');
    if (!themeBtn) throw new Error('Theme toggle button not found');
    
    const themeLabel = await this.page.$eval('.theme-toggle .btn-label', el => el.textContent);
    if (!themeLabel) throw new Error('Theme toggle label not found');
    
    // Test settings button with label
    const settingsBtn = await this.page.$('.settings-btn');
    if (!settingsBtn) throw new Error('Settings button not found');
    
    const settingsLabel = await this.page.$eval('.settings-btn .btn-label', el => el.textContent);
    if (settingsLabel !== 'Settings') throw new Error('Settings label incorrect');
    
    // Test theme toggle functionality
    await themeBtn.click();
    await this.page.waitForTimeout(1000);
    
    // Check if theme changed
    const bodyTheme = await this.page.$eval('body', el => el.getAttribute('data-theme'));
    console.log(`Current theme: ${bodyTheme}`);
  }

  async testChatFeatures() {
    // Test new chat button
    const newChatBtn = await this.page.$('.new-chat-btn');
    if (!newChatBtn) throw new Error('New chat button not found');
    
    await newChatBtn.click();
    await this.page.waitForSelector('.new-chat-modal', { timeout: 5000 });
    
    // Check new chat modal elements
    const chatNameInput = await this.page.$('input[placeholder*="chat name"]');
    const createBtn = await this.page.$('.create-chat-btn');
    
    if (!chatNameInput || !createBtn) {
      throw new Error('New chat modal elements not found');
    }
    
    // Close modal
    const closeBtn = await this.page.$('.modal-close');
    if (closeBtn) await closeBtn.click();
  }

  async testMessageFeatures() {
    // Test message input
    const messageInput = await this.page.$('#message-input');
    if (!messageInput) throw new Error('Message input not found');
    
    // Test typing in message input
    await messageInput.type('Test message');
    const inputValue = await this.page.$eval('#message-input', el => el.value);
    if (inputValue !== 'Test message') throw new Error('Message input not working');
    
    // Test send button
    const sendBtn = await this.page.$('.send-btn');
    if (!sendBtn) throw new Error('Send button not found');
    
    // Test attachment buttons
    const fileBtn = await this.page.$('.input-action-btn[aria-label="Attach file"]');
    const imageBtn = await this.page.$('.input-action-btn[aria-label="Attach image"]');
    
    if (!fileBtn || !imageBtn) throw new Error('Attachment buttons not found');
  }

  async testSearchAndMedia() {
    // Test search button
    const searchBtn = await this.page.$('.action-btn[aria-label="Search"]');
    if (!searchBtn) throw new Error('Search button not found');
    
    await searchBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if search component appears
    const searchComponent = await this.page.$('.message-search');
    if (!searchComponent) throw new Error('Search component not found');
    
    // Test media gallery button
    const mediaBtn = await this.page.$('.action-btn[aria-label="Media"]');
    if (!mediaBtn) throw new Error('Media button not found');
    
    await mediaBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if media gallery appears
    const mediaGallery = await this.page.$('.media-gallery');
    if (!mediaGallery) throw new Error('Media gallery not found');
  }

  async testVoiceRecorder() {
    // Test voice recorder component
    const voiceRecorder = await this.page.$('.voice-recorder');
    if (!voiceRecorder) throw new Error('Voice recorder not found');
    
    // Test voice recorder button
    const voiceBtn = await this.page.$('.voice-record-btn');
    if (!voiceBtn) throw new Error('Voice record button not found');
  }

  async testResponsiveDesign() {
    // Test mobile view
    await this.page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if header is still visible
    const header = await this.page.$('.app-header');
    if (!header) throw new Error('Header not visible on mobile');
    
    // Test tablet view
    await this.page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if layout adapts
    const sidebar = await this.page.$('.sidebar');
    if (!sidebar) throw new Error('Sidebar not visible on tablet');
    
    // Reset to desktop
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async testPWAFeatures() {
    // Check for service worker
    const swRegistered = await this.page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    if (!swRegistered) throw new Error('Service worker not supported');
    
    // Check for manifest
    const manifest = await this.page.$eval('link[rel="manifest"]', el => el.href);
    if (!manifest) throw new Error('Web app manifest not found');
  }

  async generateReport() {
    const reportPath = './test-results/feature-test-report.json';
    
    // Ensure directory exists
    const dir = './test-results';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write report
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    
    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${this.testResults.summary.total}`);
    console.log(`Passed: ${this.testResults.summary.passed}`);
    console.log(`Failed: ${this.testResults.summary.failed}`);
    console.log(`Success Rate: ${((this.testResults.summary.passed / this.testResults.summary.total) * 100).toFixed(1)}%`);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    try {
      await this.init();
      
      await this.runTest('App Load', () => this.testAppLoad());
      await this.runTest('Authentication', () => this.testAuthentication());
      await this.runTest('Header Features', () => this.testHeaderFeatures());
      await this.runTest('Chat Features', () => this.testChatFeatures());
      await this.runTest('Message Features', () => this.testMessageFeatures());
      await this.runTest('Search and Media', () => this.testSearchAndMedia());
      await this.runTest('Voice Recorder', () => this.testVoiceRecorder());
      await this.runTest('Responsive Design', () => this.testResponsiveDesign());
      await this.runTest('PWA Features', () => this.testPWAFeatures());
      
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests
const tester = new AppFeatureTester();
tester.runAllTests().catch(console.error);
