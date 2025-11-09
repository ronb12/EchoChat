const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Starting scheduled attachment automation');

  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS === 'false' ? false : true,
    defaultViewport: { width: 1366, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const consoleEvents = [];
  const consoleErrors = [];

  try {
    const page = await browser.newPage();

    page.on('console', async (msg) => {
      const args = await Promise.all(
        msg.args().map(async (arg) => {
          try {
            return await arg.jsonValue();
          } catch {
            return { preview: await arg.toString() };
          }
        })
      );
      const entry = { type: msg.type(), text: msg.text(), args };
      consoleEvents.push(entry);

      if (msg.type() === 'error' || /firebaseerror/i.test(msg.text()) || /missing or insufficient permissions/i.test(msg.text())) {
        consoleErrors.push(entry);
      }
    });

    const appUrl = process.env.ECHOCHAT_TEST_URL || 'http://127.0.0.1:5173/';
    console.log(`🌐 Navigating to ${appUrl}`);
    await page.goto(appUrl, { waitUntil: 'networkidle2' });
    await wait(1500);

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

    await page.waitForSelector('#email', { timeout: 20000 });
    const email = process.env.ECHOCHAT_TEST_EMAIL || 'ronellbradley@gmail.com';
    const password = process.env.ECHOCHAT_TEST_PASSWORD || '121179';
    await page.type('#email', email, { delay: 30 });
    await page.type('#password', password, { delay: 30 });
    await page.click('button[type="submit"]');

    await page.waitForSelector('.app-header', { timeout: 25000 });
    await page.waitForSelector('.chat-item', { timeout: 30000 });
    await wait(1500);
    await page.click('.chat-item');
    await wait(2000);
    console.log('🗂️ Selected first chat thread');

    const initialScheduledCount = await page.evaluate(() => {
      const items = document.querySelectorAll('.scheduled-messages-tray .scheduled-message-item');
      return items.length;
    });
    console.log(`📊 Initial scheduled count: ${initialScheduledCount}`);

    const messageText = `Automated scheduled message ${Date.now()}`;
    await page.waitForSelector('#message-input', { timeout: 15000 });
    await page.type('#message-input', messageText, { delay: 20 });
    console.log('💬 Drafted message text for scheduling');

    await page.waitForSelector('.input-action-btn.schedule-btn:not([disabled])', { timeout: 10000 });
    await page.click('.input-action-btn.schedule-btn');
    await wait(500);
    console.log('🕒 Opened schedule modal');

    await page.waitForSelector('#schedule-datetime', { timeout: 10000 });
    const targetTime = new Date(Date.now() + 120 * 1000);
    targetTime.setMilliseconds(0);
    const offset = targetTime.getTimezoneOffset() * 60000;
    const localISO = new Date(targetTime.getTime() - offset).toISOString().slice(0, 16);
    await page.$eval('#schedule-datetime', (input, value) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, localISO);

    const scheduleStateBeforeSubmit = await page.evaluate(() => window.__echochatScheduleState || null);
    console.log('🔍 Schedule state before submit:', scheduleStateBeforeSubmit);

    await page.click('.modal-content button[type="submit"]');
    await wait(2000);
    console.log('📤 Submitted schedule request');

    await page.waitForSelector('.scheduled-messages-tray .scheduled-message-item', { timeout: 25000 });
    console.log('✅ Scheduled tray shows at least one entry');

    const scheduledSummary = await page.evaluate(() => {
      const pill = document.querySelector('.scheduled-message-item .scheduled-message-pill .pill-text');
      if (!pill) {return null;}
      return pill.textContent || pill.innerText;
    });

    if (!scheduledSummary || scheduledSummary.trim().length === 0) {
      throw new Error('Scheduled message summary not found after scheduling');
    }

    console.log(`✅ Scheduled message recorded: ${scheduledSummary}`);

    if (consoleErrors.length > 0) {
      console.log('ℹ️ Console events captured during test:');
      consoleEvents.forEach(entry => {
        const extra = entry.args && entry.args.length ? ` | args=${JSON.stringify(entry.args)}` : '';
        console.log(`   [${entry.type}] ${entry.text}${extra}`);
      });
      throw new Error(`Detected ${consoleErrors.length} console error(s) during scheduled attachment test`);
    }

    console.log('🎉 Scheduled attachment automation completed successfully');
  } catch (error) {
    console.error('❌ Scheduled attachment automation failed:', error.message);
    if (consoleEvents.length) {
      console.log('ℹ️ Console events during run:');
      consoleEvents.forEach(entry => {
        const extra = entry.args && entry.args.length ? ` | args=${JSON.stringify(entry.args)}` : '';
        console.log(`   [${entry.type}] ${entry.text}${extra}`);
      });
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();

