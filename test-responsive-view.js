const puppeteer = require('puppeteer');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const VIEWPORTS = [
  { name: 'iPhone SE (375x667)', width: 375, height: 667 },
  { name: 'iPhone 12/13 (390x844)', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max (430x932)', width: 430, height: 932 },
  { name: 'iPad (768x1024)', width: 768, height: 1024 },
  { name: 'Desktop (1280x800)', width: 1280, height: 800 },
  { name: 'Large Desktop (1920x1080)', width: 1920, height: 1080 }
];

async function testViewport(page, viewport, baseUrl) {
  console.log(`\n📱 Testing: ${viewport.name} (${viewport.width}x${viewport.height})`);
  const issues = [];
  
  try {
    await page.setViewport({ width: viewport.width, height: viewport.height });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);
    
    // Login first
    try {
      const loginBtn = await page.$('[data-testid="get-started-btn"]');
      if (loginBtn) {
        await loginBtn.click();
        await delay(2000);
        await page.type('#email', 'testuser1@echochat.com', { delay: 30 });
        await delay(300);
        await page.type('#password', 'testpass123', { delay: 30 });
        await delay(300);
        const submit = await page.$('button[type="submit"]');
        if (submit) {
          await submit.click();
          await delay(4000);
        }
      }
    } catch (e) {
      console.log(`   ⚠️  Login skipped: ${e.message}`);
    }
    
    // Test 1: Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    if (hasHorizontalScroll) {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      issues.push(`Horizontal scroll detected: ${scrollWidth}px > ${clientWidth}px`);
    }
    
    // Test 2: Check key elements are visible
    const checks = [
      { selector: '.app-header', name: 'Header' },
      { selector: '.chat-area', name: 'Chat Area' },
      { selector: '#message-input', name: 'Message Input' },
      { selector: '.sidebar', name: 'Sidebar' }
    ];
    
    for (const check of checks) {
      const element = await page.$(check.selector);
      if (!element) {
        issues.push(`${check.name} not found`);
      } else {
        const isVisible = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && 
                 window.getComputedStyle(el).display !== 'none' &&
                 window.getComputedStyle(el).visibility !== 'hidden';
        }, element);
        
        if (!isVisible && check.name !== 'Sidebar') {
          issues.push(`${check.name} is not visible`);
        }
      }
    }
    
    // Test 3: Check element widths don't exceed viewport
    const elements = await page.$$('.message, .message-input-container, .sidebar, .chat-area');
    for (const el of elements) {
      const rect = await page.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { width: r.width, left: r.left };
      }, el);
      
      if (rect.width > viewport.width) {
        const className = await page.evaluate(el => el.className, el);
        issues.push(`Element ${className} width (${rect.width}px) exceeds viewport (${viewport.width}px)`);
      }
      
      if (rect.left < -10 || rect.left > viewport.width + 10) {
        const className = await page.evaluate(el => el.className, el);
        issues.push(`Element ${className} positioned outside viewport (left: ${rect.left}px)`);
      }
    }
    
    // Test 4: Check touch targets on mobile
    if (viewport.width < 768) {
      const buttons = await page.$$('button, .btn, .input-action-btn');
      for (const btn of buttons) {
        const rect = await page.evaluate(el => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height
        }), btn);
        
        if (rect.width < 44 || rect.height < 44) {
          const text = await page.evaluate(el => el.textContent || el.getAttribute('title') || 'button', btn);
          issues.push(`Touch target too small: "${text.substring(0, 20)}" (${rect.width}x${rect.height}px) - should be at least 44x44px`);
        }
      }
    }
    
    // Test 5: Check text is readable
    const textElements = await page.$$('.message-text, h1, h2, h3, p');
    for (const el of textElements.slice(0, 10)) {
      const fontSize = await page.evaluate(el => {
        return parseInt(window.getComputedStyle(el).fontSize);
      }, el);
      
      if (viewport.width < 768 && fontSize < 14) {
        const text = await page.evaluate(el => el.textContent?.substring(0, 30), el);
        issues.push(`Text may be too small on mobile: "${text}" (${fontSize}px)`);
      }
    }
    
    // Test 6: Check modals fit on screen
    const modals = await page.$$('.modal-content');
    for (const modal of modals) {
      const rect = await page.evaluate(el => ({
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height
      }), modal);
      
      if (rect.width > viewport.width * 0.95) {
        issues.push(`Modal too wide: ${rect.width}px (viewport: ${viewport.width}px)`);
      }
      
      if (rect.height > viewport.height * 0.9) {
        issues.push(`Modal too tall: ${rect.height}px (viewport: ${viewport.height}px)`);
      }
    }
    
    if (issues.length === 0) {
      console.log(`   ✅ All checks passed`);
      return { viewport: viewport.name, passed: true, issues: [] };
    } else {
      console.log(`   ❌ Found ${issues.length} issues:`);
      issues.forEach(issue => console.log(`      - ${issue}`));
      return { viewport: viewport.name, passed: false, issues };
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { viewport: viewport.name, passed: false, issues: [error.message] };
  }
}

async function runResponsiveTests() {
  console.log('🚀 Starting Responsive Design Tests\n');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];
  
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    const baseUrl = 'http://localhost:3000';
    
    for (const viewport of VIEWPORTS) {
      const result = await testViewport(page, viewport, baseUrl);
      results.push(result);
      await delay(1000);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESPONSIVE TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Issues found:');
      results.forEach(result => {
        if (!result.passed && result.issues.length > 0) {
          console.log(`\n${result.viewport}:`);
          result.issues.forEach(issue => console.log(`  - ${issue}`));
        }
      });
    }
    
    await delay(3000);
    return failed === 0;
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

runResponsiveTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


