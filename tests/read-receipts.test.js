const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Starting automated read receipt verification');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const consoleEvents = [];
  const consoleErrors = [];

  try {
    const page = await browser.newPage();

    const serializeConsoleMessage = async (msg) => {
      const args = await Promise.all(
        msg.args().map(async (arg) => {
          try {
            const val = await arg.jsonValue();
            if (typeof val === 'object' && val !== null) {
              if (val.message && val.stack) {
                return { message: val.message, stack: val.stack };
              }
              return val;
            }
            return val;
          } catch {
            return msg.text();
          }
        })
      );
      return {
        type: msg.type(),
        text: msg.text(),
        args
      };
    };

    page.on('console', async msg => {
      const entry = await serializeConsoleMessage(msg);
      consoleEvents.push(entry);

      const lowerText = entry.text.toLowerCase();
      const isErrorType = entry.type === 'error';
      const isPermissionError = lowerText.includes('missing or insufficient permissions');
      const isFirebaseError = lowerText.includes('firebaseerror');

      if (isErrorType || isPermissionError || isFirebaseError) {
        consoleErrors.push(entry);
      }
    });

    const appUrl = process.env.ECHOCHAT_TEST_URL || 'http://127.0.0.1:5173/';
    console.log(`🌐 Navigating to ${appUrl}`);
    await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await wait(2000);

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
    await page.type('#email', process.env.ECHOCHAT_TEST_EMAIL || 'testuser1@echochat.com', { delay: 40 });
    await page.type('#password', process.env.ECHOCHAT_TEST_PASSWORD || 'test123', { delay: 40 });
    await page.click('button[type="submit"]');

    await page.waitForSelector('.app-header', { timeout: 25000 });

    const chatSelector = '.chat-item';
    try {
      await page.waitForSelector(chatSelector, { timeout: 45000 });
    } catch (err) {
      const availableChats = await page.evaluate(() => {
        return {
          count: document.querySelectorAll('.chat-item').length,
          sidebarExists: !!document.querySelector('.sidebar'),
          pageState: document.body.innerText.slice(0, 500)
        };
      });
      console.error('ℹ️ Debug: chat availability snapshot', availableChats);
      throw err;
    }
    await page.click(chatSelector);
    await wait(2000);

    const scrolled = await page.evaluate(() => {
      const container = document.querySelector('.messages-container');
      if (!container) {
        return false;
      }
      container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
      return true;
    });

    if (!scrolled) {
      throw new Error('Messages container not found to trigger read receipt');
    }

    await wait(5000);

    if (consoleErrors.length > 0) {
      console.log('ℹ️ Console events captured during test:');
      consoleEvents.forEach(entry => {
        const extra = entry.args && entry.args.length ? ` | args=${JSON.stringify(entry.args)}` : '';
        console.log(`   [${entry.type}] ${entry.text}${extra}`);
      });
      consoleErrors.forEach(err => {
        console.error(`🚫 Console ${err.type}: ${err.text}`);
      });
      throw new Error(`Detected ${consoleErrors.length} console error(s) while verifying read receipts`);
    }

    console.log('✅ Read receipt flow executed without console errors');
  } catch (error) {
    console.error('❌ Read receipt verification failed:', error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();


