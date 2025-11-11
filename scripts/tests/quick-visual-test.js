/**
 * Quick Visual Test - Takes screenshots of the app
 */

const puppeteer = require('puppeteer');

async function takeScreenshots() {
  console.log('📸 Starting visual test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('Loading app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot of landing page
    console.log('Taking landing page screenshot...');
    await page.screenshot({ 
      path: './screenshots/test-landing-page.png',
      fullPage: true 
    });
    
    // Check for key elements
    console.log('\n🔍 Checking key elements...');
    
    // Check EchoChat title visibility
    const titleStyles = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return null;
      const styles = window.getComputedStyle(h1);
      return {
        color: styles.color,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        textShadow: styles.textShadow,
        textContent: h1.textContent
      };
    });
    
    if (titleStyles) {
      console.log('✅ EchoChat title found:');
      console.log(`   Text: ${titleStyles.textContent}`);
      console.log(`   Color: ${titleStyles.color}`);
      console.log(`   Font Size: ${titleStyles.fontSize}`);
      console.log(`   Font Weight: ${titleStyles.fontWeight}`);
    } else {
      console.log('❌ EchoChat title not found');
    }
    
    // Check for header button labels (will only show if logged in)
    const buttons = await page.evaluate(() => {
      const btnLabels = Array.from(document.querySelectorAll('.btn-label'));
      return btnLabels.map(btn => btn.textContent);
    });
    
    if (buttons.length > 0) {
      console.log('\n✅ Button labels found:');
      buttons.forEach(label => console.log(`   - ${label}`));
    } else {
      console.log('\n⚠️  Button labels not visible (user not logged in)');
    }
    
    // Check overall theme
    const bodyTheme = await page.evaluate(() => {
      return document.body.getAttribute('data-theme');
    });
    console.log(`\n📱 Current theme: ${bodyTheme || 'default'}`);
    
    console.log('\n✅ Visual test complete!');
    console.log('📸 Screenshot saved to: ./screenshots/test-landing-page.png');
    
  } catch (error) {
    console.error('❌ Error during visual test:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
