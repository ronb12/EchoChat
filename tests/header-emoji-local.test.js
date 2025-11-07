const puppeteer = require('puppeteer');

async function run() {
  console.log('🚀 Starting local UI verification (header + emoji picker)');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    const appUrl = process.env.ECHOCHAT_TEST_URL || 'http://127.0.0.1:5173/';
    console.log(`🌐 Navigating to ${appUrl}`);
    await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.waitForSelector('button', { timeout: 15000 });
    const clickedSignIn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(btn => (btn.innerText || '').toLowerCase().includes('sign in'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (!clickedSignIn) {
      throw new Error('Unable to locate sign-in button on landing page');
    }

    await page.waitForSelector('#email', { timeout: 15000 });
    const emailField = await page.$('#email');
    if (emailField) {
      await page.type('#email', process.env.ECHOCHAT_TEST_EMAIL || 'testuser1@echochat.com', { delay: 50 });
      await page.type('#password', process.env.ECHOCHAT_TEST_PASSWORD || 'test123', { delay: 50 });
      await page.click('button[type="submit"]');
    }

    await page.waitForSelector('.app-header', { timeout: 25000 });
    await page.waitForTimeout(2000);

    const headerMetrics = await page.evaluate(() => {
      const el = document.querySelector('.app-header');
      if (!el) { return null; }
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      return {
        height: rect.height,
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom
      };
    });

    if (!headerMetrics) {
      throw new Error('Header element not found after login');
    }

    console.log('📏 Header metrics:', headerMetrics);
    if (headerMetrics.height > 80) {
      throw new Error(`Header too tall (${headerMetrics.height}px)`);
    }

    const firstChat = await page.$('.chat-item');
    let emojiStyles = null;
    if (firstChat) {
      await firstChat.click();
      await page.waitForSelector('.emoji-btn', { timeout: 10000 });
      await page.click('.emoji-btn');
      await page.waitForSelector('.emoji-picker', { timeout: 10000 });

      emojiStyles = await page.evaluate(() => {
        const picker = document.querySelector('.emoji-picker');
        const grid = document.querySelector('.emoji-grid');
        if (!picker || !grid) {
          return null;
        }
        const pickerStyles = window.getComputedStyle(picker);
        const gridStyles = window.getComputedStyle(grid);
        return {
          overflowX: pickerStyles.overflowX,
          overflowY: pickerStyles.overflowY,
          gridTemplateColumns: gridStyles.gridTemplateColumns,
          pickerHeight: picker.getBoundingClientRect().height,
          emojiCount: grid.querySelectorAll('.emoji-item').length,
          mode: 'interactive'
        };
      });
    } else {
      emojiStyles = await page.evaluate(() => {
        const tempPicker = document.createElement('div');
        tempPicker.className = 'emoji-picker';
        const tempGrid = document.createElement('div');
        tempGrid.className = 'emoji-grid';
        tempPicker.appendChild(tempGrid);
        document.body.appendChild(tempPicker);
        const pickerStyles = window.getComputedStyle(tempPicker);
        const gridStyles = window.getComputedStyle(tempGrid);
        const result = {
          overflowX: pickerStyles.overflowX,
          overflowY: pickerStyles.overflowY,
          gridTemplateColumns: gridStyles.gridTemplateColumns,
          mode: 'synthetic'
        };
        document.body.removeChild(tempPicker);
        return result;
      });
    }

    if (!emojiStyles) {
      throw new Error('Emoji picker styles could not be determined');
    }

    console.log('😀 Emoji picker styles:', emojiStyles);
    if (emojiStyles.overflowX !== 'hidden') {
      throw new Error(`Emoji picker overflow-x is ${emojiStyles.overflowX}, expected hidden`);
    }

    console.log('✅ Header height and emoji picker checks passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();

