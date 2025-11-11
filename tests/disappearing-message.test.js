/**
 * Puppeteer E2E check for disappearing messages.
 * - Launches the dev server UI
 * - Continues as demo user (no Firebase login)
 * - Seeds a chat/message via chatService (local mode)
 * - Verifies countdown indicator
 * - Confirms message transitions to deleted state after timer
 */

const puppeteer = require('puppeteer');

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:5173';
const CHAT_NAME = 'Puppeteer Demo Chat';
const DISAPPEAR_SECONDS = 5;

async function waitForChatToAppear(page, chatName, timeout = 30000) {
  await page.waitForFunction(
    (name) => {
      const chatNames = Array.from(document.querySelectorAll('.chat-item .chat-name'));
      return chatNames.some((el) => el.textContent?.trim()?.includes(name));
    },
    { timeout },
    chatName
  );
}

async function selectChat(page, chatName) {
  const clicked = await page.evaluate((name) => {
    const items = Array.from(document.querySelectorAll('.chat-item'));
    const target = items.find((item) => {
      const nameEl = item.querySelector('.chat-name');
      const text = nameEl?.textContent?.trim() || '';
      return text.includes(name);
    });
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, chatName);

  if (!clicked) {
    throw new Error(`Unable to select chat named "${chatName}"`);
  }
}

async function seedDisappearingMessage(page) {
  return page.evaluate(async ({ chatName, disappearSeconds }) => {
    const { chatService } = await import('/src/services/chatService.js');
    chatService.useFirestore = false;

    const chat = await chatService.createChat(['demo-user'], chatName, false);
    const message = await chatService.sendMessage(
      chat.id,
      {
        senderId: 'demo-user',
        senderName: 'Demo User',
        text: 'Automated disappearing message'
      },
      'demo-user'
    );

    await chatService.setDisappearingTimer(chat.id, message.id, disappearSeconds);

    return {
      chatId: chat.id,
      messageId: message.id
    };
  }, { chatName: CHAT_NAME, disappearSeconds: DISAPPEAR_SECONDS });
}

async function main() {
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false'
  });
  const page = await browser.newPage();

  console.log(`🌐 Opening ${APP_URL}`);
  await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 60000 });

  console.log('🔌 Waiting for test hooks');
  await page.waitForFunction(() => {
    return !!window.__ECHOCHAT_TEST_HOOKS__ && !!window.__ECHOCHAT_AUTH_TEST_HOOKS__;
  }, { timeout: 20000 });

  console.log('🚪 Setting demo auth state');
  await page.evaluate(() => {
    const authHooks = window.__ECHOCHAT_AUTH_TEST_HOOKS__;
    if (!authHooks) {
      throw new Error('Auth test hooks unavailable');
    }
    authHooks.setUser({
      uid: 'demo-user',
      email: 'demo@example.com',
      displayName: 'Demo User'
    });
    authHooks.setLoading(false);
    const chatHooks = window.__ECHOCHAT_TEST_HOOKS__;
    if (chatHooks) {
      chatHooks.setChats([]);
      chatHooks.setMessages([]);
      chatHooks.setCurrentChatId(null);
    }
  });

  console.log('✨ Seeding disappearing message via chatService');
  const seeded = await seedDisappearingMessage(page);

  console.log('🧪 Injecting chat into UI state via test hooks');
  await page.evaluate(async ({ chatId, messageId, chatName }) => {
    const hooks = window.__ECHOCHAT_TEST_HOOKS__;
    if (!hooks) {
      throw new Error('Test hooks not available');
    }

    const { chatService } = await import('/src/services/chatService.js');
    const messages = chatService.chatIdToMessages.get(chatId) || [];

    hooks.setChats([{
      id: chatId,
      name: chatName,
      participants: ['demo-user'],
      type: 'direct',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      avatar: null,
      lastMessage: messages[0]?.text || 'Automated disappearing message',
      unreadCount: 0
    }]);
    hooks.setCurrentChatId(chatId);
    hooks.setMessages(messages);
  }, { chatId: seeded.chatId, messageId: seeded.messageId, chatName: CHAT_NAME });

  console.log('💬 Waiting for seeded message to render');
  await page.waitForSelector(`#message-${seeded.messageId}`, { timeout: 15000 });

  console.log('⏱ Waiting for countdown indicator');
  await page.waitForSelector('.message-disappearing-indicator', { timeout: 5000 });

  console.log('⌛ Waiting for message to disappear');
  await page.waitForFunction(() => {
    const indicator = document.querySelector('.message-disappearing-indicator');
    const deletedText = document.querySelector('.message-text.deleted-text');
    return (!indicator || indicator.textContent?.includes('less than')) &&
      deletedText?.textContent?.includes('This message was deleted');
  }, { timeout: (DISAPPEAR_SECONDS + 10) * 1000 });

  console.log('✅ Disappearing message behaved as expected!');
  await browser.close();
}

main().catch(async (error) => {
  console.error('❌ Disappearing message test failed:', error);
  process.exitCode = 1;
});

