const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('✉️  Starting automated message send');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    const appUrl = process.env.ECHOCHAT_TEST_URL || 'http://127.0.0.1:5173/';
    const senderEmail = process.env.ECHOCHAT_SENDER_EMAIL || 'ronellbradley@bradleyvs.com';
    const senderPassword = process.env.ECHOCHAT_SENDER_PASSWORD || process.env.ECHOCHAT_TEST_PASSWORD || '121179';
    const messageText = `Automated read receipt check ${new Date().toISOString()}`;

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
    await page.type('#email', senderEmail, { delay: 40 });
    await page.type('#password', senderPassword, { delay: 40 });
    await page.click('button[type="submit"]');

    await page.waitForSelector('.chat-item', { timeout: 25000 });
    await page.click('.chat-item');
    await page.waitForSelector('#message-input', { timeout: 25000 });

    await page.type('#message-input', messageText, { delay: 30 });
    await page.click('.send-btn');

    await page.waitForFunction(
      (text) => {
        const messageNodes = Array.from(document.querySelectorAll('.message-text'));
        return messageNodes.some(node => (node.innerText || '').includes(text));
      },
      { timeout: 10000 },
      messageText
    );

    console.log(`✅ Message sent: "${messageText}"`);
  } catch (error) {
    console.error('❌ Failed to send automated message:', error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();


