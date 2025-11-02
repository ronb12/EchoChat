#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUsers: {
    user1: {
      email: 'testuser1@echochat.com',
      password: 'TestUser123!',
      name: 'Test User 1'
    },
    user2: {
      email: 'testuser2@echochat.com',
      password: 'TestUser123!',
      name: 'Test User 2'
    }
  }
};

class ManualTester {
  constructor() {
    this.browser = null;
    this.page1 = null;
    this.page2 = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Starting Manual EchoChat Test Suite...');
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page1 = await this.browser.newPage();
    this.page2 = await this.browser.newPage();
    
    await this.page1.setViewport({ width: 1280, height: 720 });
    await this.page2.setViewport({ width: 1280, height: 720 });
  }

  async testAppLoading() {
    console.log('\n📱 Testing App Loading...');
    
    try {
      await this.page1.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for loading screen to disappear
      await this.page1.waitForSelector('#loading-screen', { timeout: 10000 });
      await this.page1.waitForFunction(() => {
        const loadingScreen = document.getElementById('loading-screen');
        return loadingScreen && loadingScreen.style.display === 'none';
      }, { timeout: 15000 });
      
      // Check if app is visible
      const appVisible = await this.page1.$('#app');
      const loginModalVisible = await this.page1.$('.modal');
      
      this.results.push({
        test: 'App Loading',
        status: appVisible && loginModalVisible ? 'PASS' : 'FAIL',
        details: 'App loaded and login modal displayed'
      });
      
      console.log('✅ App loading test completed');
      return true;
    } catch (error) {
      this.results.push({
        test: 'App Loading',
        status: 'FAIL',
        details: error.message
      });
      console.log('❌ App loading test failed:', error.message);
      return false;
    }
  }

  async testLogin() {
    console.log('\n🔐 Testing Login...');
    
    try {
      // Wait for login modal
      await this.page1.waitForSelector('.modal', { timeout: 10000 });
      
      // Click signin tab
      await this.page1.click('[data-tab="signin"]');
      await this.page1.waitForTimeout(1000);
      
      // Fill login form
      await this.page1.type('#signin-email', TEST_CONFIG.testUsers.user1.email);
      await this.page1.type('#signin-password', TEST_CONFIG.testUsers.user1.password);
      
      // Submit form
      await this.page1.click('#signin-form button[type="submit"]');
      
      // Wait for successful login
      await this.page1.waitForSelector('#app', { timeout: 15000 });
      await this.page1.waitForFunction(() => {
        const modal = document.querySelector('.modal');
        return !modal || modal.style.display === 'none';
      }, { timeout: 10000 });
      
      this.results.push({
        test: 'User Login',
        status: 'PASS',
        details: `Logged in as ${TEST_CONFIG.testUsers.user1.email}`
      });
      
      console.log('✅ Login test completed');
      return true;
    } catch (error) {
      this.results.push({
        test: 'User Login',
        status: 'FAIL',
        details: error.message
      });
      console.log('❌ Login test failed:', error.message);
      return false;
    }
  }

  async testUIElements() {
    console.log('\n🎨 Testing UI Elements...');
    
    try {
      // Test sidebar
      const sidebar = await this.page1.$('#sidebar');
      const sidebarVisible = sidebar ? await this.page1.evaluate(el => el.offsetParent !== null, sidebar) : false;
      
      // Test chat interface
      const chatInterface = await this.page1.$('#chat-interface');
      const chatVisible = chatInterface ? await this.page1.evaluate(el => el.offsetParent !== null, chatInterface) : false;
      
      // Test message input
      const messageInput = await this.page1.$('#message-input');
      const inputVisible = messageInput ? await this.page1.evaluate(el => el.offsetParent !== null, messageInput) : false;
      
      // Test theme toggle
      const themeToggle = await this.page1.$('#theme-toggle');
      const themeVisible = themeToggle ? await this.page1.evaluate(el => el.offsetParent !== null, themeToggle) : false;
      
      const allElementsVisible = sidebarVisible && chatVisible && inputVisible && themeVisible;
      
      this.results.push({
        test: 'UI Elements',
        status: allElementsVisible ? 'PASS' : 'FAIL',
        details: `Sidebar: ${sidebarVisible}, Chat: ${chatVisible}, Input: ${inputVisible}, Theme: ${themeVisible}`
      });
      
      console.log('✅ UI elements test completed');
      return true;
    } catch (error) {
      this.results.push({
        test: 'UI Elements',
        status: 'FAIL',
        details: error.message
      });
      console.log('❌ UI elements test failed:', error.message);
      return false;
    }
  }

  async testMessaging() {
    console.log('\n💬 Testing Messaging...');
    
    try {
      // Test message input
      await this.page1.waitForSelector('#message-input', { timeout: 5000 });
      
      const testMessage = `Test message ${Date.now()}`;
      await this.page1.type('#message-input', testMessage);
      
      // Test send button
      const sendButton = await this.page1.$('#send-btn');
      const sendButtonEnabled = sendButton ? await this.page1.evaluate(el => !el.disabled, sendButton) : false;
      
      if (sendButtonEnabled) {
        await this.page1.click('#send-btn');
        await this.page1.waitForTimeout(2000);
        
        // Check if message appeared
        const messageExists = await this.page1.evaluate((msg) => {
          const messages = document.querySelectorAll('.message-content');
          return Array.from(messages).some(el => el.textContent.includes(msg));
        }, testMessage);
        
        this.results.push({
          test: 'Messaging',
          status: messageExists ? 'PASS' : 'FAIL',
          details: `Message sent and displayed: ${messageExists}`
        });
      } else {
        this.results.push({
          test: 'Messaging',
          status: 'FAIL',
          details: 'Send button not enabled'
        });
      }
      
      console.log('✅ Messaging test completed');
      return true;
    } catch (error) {
      this.results.push({
        test: 'Messaging',
        status: 'FAIL',
        details: error.message
      });
      console.log('❌ Messaging test failed:', error.message);
      return false;
    }
  }

  async testPWAFeatures() {
    console.log('\n📱 Testing PWA Features...');
    
    try {
      // Check service worker
      const serviceWorker = await this.page1.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      // Check manifest
      const manifest = await this.page1.evaluate(() => {
        return document.querySelector('link[rel="manifest"]') !== null;
      });
      
      // Check responsive design
      const responsive = await this.page1.evaluate(() => {
        return window.innerWidth > 0 && window.innerHeight > 0;
      });
      
      const pwaWorking = serviceWorker && manifest && responsive;
      
      this.results.push({
        test: 'PWA Features',
        status: pwaWorking ? 'PASS' : 'FAIL',
        details: `Service Worker: ${serviceWorker}, Manifest: ${manifest}, Responsive: ${responsive}`
      });
      
      console.log('✅ PWA features test completed');
      return true;
    } catch (error) {
      this.results.push({
        test: 'PWA Features',
        status: 'FAIL',
        details: error.message
      });
      console.log('❌ PWA features test failed:', error.message);
      return false;
    }
  }

  async testResponsiveDesign() {
    console.log('\n📱 Testing Responsive Design...');
    
    try {
      const viewports = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1280, height: 720 }
      ];
      
      let allViewportsWorking = true;
      
      for (const viewport of viewports) {
        await this.page1.setViewport(viewport);
        await this.page1.waitForTimeout(1000);
        
        const appVisible = await this.page1.$('#app');
        const working = appVisible ? await this.page1.evaluate(el => el.offsetParent !== null, appVisible) : false;
        
        if (!working) {
          allViewportsWorking = false;
        }
        
        console.log(`  ${viewport.name}: ${working ? 'PASS' : 'FAIL'}`);
      }
      
      this.results.push({
        test: 'Responsive Design',
        status: allViewportsWorking ? 'PASS' : 'FAIL',
        details: `Tested ${viewports.length} viewports`
      });
      
      console.log('✅ Responsive design test completed');
      return true;
    } catch (error) {
      this.results.push({
        test: 'Responsive Design',
        status: 'FAIL',
        details: error.message
      });
      console.log('❌ Responsive design test failed:', error.message);
      return false;
    }
  }

  async testNewFeatures() {
    console.log('\n🆕 Testing New Features...');
    
    try {
      // Test typing indicators (if implemented)
      const typingIndicatorExists = await this.page1.evaluate(() => {
        return document.querySelector('.typing-indicator') !== null;
      });
      
      // Test presence indicators
      const presenceIndicatorExists = await this.page1.evaluate(() => {
        return document.querySelector('.presence-indicator') !== null;
      });
      
      // Test media previews
      const mediaPreviewExists = await this.page1.evaluate(() => {
        return document.querySelector('.media-preview') !== null;
      });
      
      // Test enhanced message bubbles
      const messageBubbles = await this.page1.evaluate(() => {
        const messages = document.querySelectorAll('.message');
        return messages.length > 0;
      });
      
      const newFeaturesWorking = presenceIndicatorExists && messageBubbles;
      
      this.results.push({
        test: 'New Features',
        status: newFeaturesWorking ? 'PASS' : 'FAIL',
        details: `Presence: ${presenceIndicatorExists}, Messages: ${messageBubbles}, Typing: ${typingIndicatorExists}, Media: ${mediaPreviewExists}`
      });
      
      console.log('✅ New features test completed');
      return true;
    } catch (error) {
      this.results.push({
        test: 'New Features',
        status: 'FAIL',
        details: error.message
      });
      console.log('❌ New features test failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    await this.init();
    
    console.log('Starting comprehensive feature testing...\n');
    
    await this.testAppLoading();
    await this.testLogin();
    await this.testUIElements();
    await this.testMessaging();
    await this.testPWAFeatures();
    await this.testResponsiveDesign();
    await this.testNewFeatures();
    
    await this.generateReport();
    await this.cleanup();
  }

  async generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.status}`);
      console.log(`   Details: ${result.details}`);
      console.log('');
      
      if (result.status === 'PASS') passed++;
      else failed++;
    });
    
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
    
    // Save results to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed,
        failed,
        successRate: Math.round((passed / this.results.length) * 100)
      },
      results: this.results
    };
    
    fs.writeFileSync('test-results/manual-test-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Report saved to: test-results/manual-test-report.json');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('\n🏁 Testing completed!');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ManualTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ManualTester;
