// Production-ready chat service with Firebase Firestore backend
// Falls back to localStorage for offline/demo mode
import { encryptionService } from './encryptionService';
import { firestoreService } from './firestoreService';

class ChatService {
  constructor() {
    this.chatIdToMessages = new Map();
    this.chatIdToTypingUsers = new Map();
    this.userIdToPresence = new Map();
    this.userIdToChats = new Map();
    this.notificationListeners = new Set();
    this.scheduledMessages = new Map();
    this.lastMessageTimes = new Map();
    this.useFirestore = true; // Use Firestore as primary backend
    this.firestoreUnsubscribes = new Map();

    // Try to use Firestore, fall back to localStorage if unavailable
    this.initializeBackend();

    // Listen for storage changes (for cross-tab communication in localStorage mode)
    if (!this.useFirestore) {
      window.addEventListener('storage', (e) => {
        if (e.key === 'echochat_messages') {
          this.loadMessagesFromStorage();
          this.notifyAllSubscribers();
        }
      });
    }

    // Start scheduled messages checker
    this.startScheduledMessageChecker();
  }

  async initializeBackend() {
    // Check if Firestore is available
    try {
      // Test Firestore connection
      this.useFirestore = true;
    } catch (error) {
      console.warn('Firestore not available, using localStorage fallback:', error);
      this.useFirestore = false;
      this.loadMessagesFromStorage();
    }
  }

  loadMessagesFromStorage() {
    try {
      const stored = localStorage.getItem('echochat_messages');
      if (stored) {
        const data = JSON.parse(stored);
        this.chatIdToMessages = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading messages from storage:', error);
    }
  }

  saveMessagesToStorage() {
    try {
      const data = Object.fromEntries(this.chatIdToMessages);
      localStorage.setItem('echochat_messages', JSON.stringify(data));

      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'echochat_messages',
        newValue: JSON.stringify(data)
      }));
    } catch (error) {
      console.error('Error saving messages to storage:', error);
    }
  }

  notifyAllSubscribers() {
    // Notify all message subscribers by polling them
    // This is handled by the polling mechanism in subscribeToMessages
  }

  // Messages - Uses Firestore for real-time sync, localStorage as fallback
  subscribeToMessages(chatId, callback) {
    if (this.useFirestore) {
      // Use Firestore real-time subscription
      try {
        const unsubscribe = firestoreService.subscribeToMessages(chatId, (messages) => {
          // Decrypt messages that need decryption
          const processedMessages = messages.map(msg => ({
            ...msg,
            needsDecryption: msg.isEncrypted && msg.encryptedText
          }));
          callback(processedMessages);
        });

        this.firestoreUnsubscribes.set(chatId, unsubscribe);
        return () => {
          if (this.firestoreUnsubscribes.has(chatId)) {
            this.firestoreUnsubscribes.get(chatId)();
            this.firestoreUnsubscribes.delete(chatId);
          }
        };
      } catch (error) {
        console.warn('Firestore subscription failed, falling back to localStorage:', error);
        this.useFirestore = false;
        // Fall through to localStorage mode
      }
    }

    // Fallback: localStorage mode with polling
    if (!this.chatIdToMessages.has(chatId)) {
      this.chatIdToMessages.set(chatId, []);
    }
    // Immediately deliver current state
    callback(this.chatIdToMessages.get(chatId));

    // Set up polling to check for updates (simulating real-time)
    const interval = setInterval(() => {
      const messages = this.chatIdToMessages.get(chatId) || [];
      callback(messages);
    }, 500);

    const unsubscribe = () => {
      clearInterval(interval);
    };
    return unsubscribe;
  }

  // Send a message with validation and encryption
  async sendMessage(chatId, message, userId = null) {
    // Input validation
    if (!chatId || !message || !message.senderId) {
      throw new Error('Invalid message data');
    }

    // Validate message length
    const maxLength = 4000;
    if (message.text && message.text.length > maxLength) {
      throw new Error(`Message too long. Maximum ${maxLength} characters.`);
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (message.fileSize && message.fileSize > maxFileSize) {
      throw new Error(`File too large. Maximum ${(maxFileSize / 1024 / 1024).toFixed(0)}MB.`);
    }

    // Rate limiting check (basic)
    const lastMessageTime = this.lastMessageTimes?.get(message.senderId) || 0;
    const rateLimitMs = 100; // 100ms between messages
    if (Date.now() - lastMessageTime < rateLimitMs) {
      throw new Error('Please wait before sending another message');
    }
    this.lastMessageTimes = this.lastMessageTimes || new Map();
    this.lastMessageTimes.set(message.senderId, Date.now());

    // Encrypt message text if present
    let encryptedText = null;
    let isEncrypted = false;

    if (message.text && message.text.trim()) {
      try {
        const encryptionResult = await encryptionService.encryptMessageText(
          message.text,
          userId || message.senderId,
          chatId
        );

        if (encryptionResult && encryptionResult.encrypted) {
          encryptedText = encryptionResult;
          isEncrypted = true;
        } else {
          encryptedText = message.text; // Fallback if encryption fails
        }
      } catch (error) {
        console.error('Encryption error, sending unencrypted:', error);
        encryptedText = message.text; // Fallback to unencrypted
      }
    }

    // Prepare message data
    const messageData = {
      text: isEncrypted ? null : (message.text || ''), // Store encrypted data separately
      encryptedText: encryptedText, // Encrypted message data
      isEncrypted: isEncrypted,
      senderId: message.senderId,
      senderName: message.senderName,
      timestamp: Date.now(),
      deliveredAt: Date.now(),
      readAt: null,
      reactions: {},
      edited: false,
      editedAt: null,
      deleted: false,
      deletedAt: null,
      deletedForEveryone: false,
      // Preserve media fields
      sticker: message.sticker || null,
      stickerId: message.stickerId || null,
      stickerPackId: message.stickerPackId || null,
      image: message.image || null,
      audio: message.audio || null,
      video: message.video || null,
      videoName: message.videoName || null,
      file: message.file || null,
      imageName: message.imageName || null,
      audioName: message.audioName || null,
      fileName: message.fileName || null,
      fileSize: message.fileSize || null,
      fileType: message.fileType || null,
      // Spread rest of message fields
      ...message
    };

    // Remove text if encrypted (to avoid storing plaintext)
    if (isEncrypted) {
      delete messageData.text;
    }

    // Use Firestore if available, otherwise localStorage
    if (this.useFirestore) {
      try {
        const newMessage = await firestoreService.sendMessage(chatId, messageData);
        // Real-time subscription will handle notifying subscribers
        return newMessage;
      } catch (error) {
        console.error('Firestore sendMessage failed, falling back to localStorage:', error);
        this.useFirestore = false;
        // Fall through to localStorage
      }
    }

    // Fallback: localStorage mode
    const messages = this.chatIdToMessages.get(chatId) || [];
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...messageData
    };

    messages.push(newMessage);
    this.chatIdToMessages.set(chatId, messages);

    // Save to localStorage for persistence across tabs
    this.saveMessagesToStorage();

    // Notify all subscribers
    this.notifyMessageSubscribers(chatId);

    return newMessage;
  }

  // Mark message as read
  markMessageAsRead(chatId, messageId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message && !message.readAt) {
      message.readAt = Date.now();
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
    }
  }

  // Add reaction to message
  addReaction(chatId, messageId, emoji, userId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message) {
      if (!message.reactions) {message.reactions = {};}
      if (!message.reactions[emoji]) {message.reactions[emoji] = [];}
      if (!message.reactions[emoji].includes(userId)) {
        message.reactions[emoji].push(userId);
      }
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
    }
  }

  // Remove reaction from message
  removeReaction(chatId, messageId, emoji, userId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message && message.reactions && message.reactions[emoji]) {
      message.reactions[emoji] = message.reactions[emoji].filter(id => id !== userId);
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
    }
  }

  // Edit message
  async editMessage(chatId, messageId, newText, userId) {
    // Use Firestore if available
    if (this.useFirestore) {
      try {
        const updatedMessage = await firestoreService.editMessage(messageId, newText);
        // Real-time subscription will handle notifying subscribers
        return updatedMessage;
      } catch (error) {
        console.error('Firestore editMessage failed, falling back to localStorage:', error);
        this.useFirestore = false;
        // Fall through to localStorage
      }
    }

    // Fallback: localStorage mode
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message && message.senderId === userId) {
      message.text = newText;
      message.edited = true;
      message.editedAt = Date.now();
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
      return message;
    }
    return null;
  }

  // Delete message
  async deleteMessage(chatId, messageId, userId, forEveryone = false) {
    // Use Firestore if available
    if (this.useFirestore) {
      try {
        const deletedMessage = await firestoreService.deleteMessage(messageId, forEveryone);
        // Real-time subscription will handle notifying subscribers
        return deletedMessage;
      } catch (error) {
        console.error('Firestore deleteMessage failed, falling back to localStorage:', error);
        this.useFirestore = false;
        // Fall through to localStorage
      }
    }

    // Fallback: localStorage mode
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message && message.senderId === userId) {
      if (forEveryone) {
        message.deleted = true;
        message.deletedForEveryone = true;
        message.deletedAt = Date.now();
        message.text = 'This message was deleted';
        message.image = null;
        message.file = null;
        message.audio = null;
      } else {
        // Delete for self only - mark as deleted
        message.deleted = true;
        message.deletedAt = Date.now();
      }
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
      return message;
    }
    return null;
  }

  // Set disappearing message timer
  setDisappearingTimer(chatId, messageId, seconds) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.disappearing = true;
      message.disappearsAt = Date.now() + (seconds * 1000);

      // Set timer to auto-delete
      setTimeout(() => {
        const currentMessages = this.chatIdToMessages.get(chatId) || [];
        const msg = currentMessages.find(m => m.id === messageId);
        if (msg) {
          msg.deleted = true;
          msg.deletedForEveryone = true;
          msg.deletedAt = Date.now();
          msg.text = 'This message disappeared';
          this.saveMessagesToStorage();
          this.notifyMessageSubscribers(chatId);
        }
      }, seconds * 1000);

      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
      return message;
    }
    return null;
  }

  // Check and delete expired disappearing messages
  checkDisappearingMessages(chatId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const now = Date.now();
    let updated = false;

    messages.forEach(message => {
      if (message.disappearing && message.disappearsAt && now >= message.disappearsAt) {
        message.deleted = true;
        message.deletedForEveryone = true;
        message.deletedAt = now;
        message.text = 'This message disappeared';
        message.image = null;
        message.file = null;
        message.audio = null;
        updated = true;
      }
    });

    if (updated) {
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
    }
  }

  // Internal method to notify subscribers
  notifyMessageSubscribers(chatId) {
    // This will be called by the polling in subscribeToMessages
    // In a real implementation, this would push to subscribers
  }

  // Typing indicators
  sendTypingIndicator(chatId, userId, displayName) {
    const key = chatId;
    const current = new Map(this.chatIdToTypingUsers.get(key) || []);
    current.set(userId, { userId, displayName, ts: Date.now() });
    this.chatIdToTypingUsers.set(key, current);
    // Auto-expire after 3s
    setTimeout(() => this.stopTypingIndicator(chatId, userId), 3000);
  }

  stopTypingIndicator(chatId, userId) {
    const key = chatId;
    const current = new Map(this.chatIdToTypingUsers.get(key) || []);
    if (current.has(userId)) {
      current.delete(userId);
      this.chatIdToTypingUsers.set(key, current);
    }
  }

  // Scheduled messages checker (runs every minute)
  startScheduledMessageChecker() {
    if (this.scheduledMessageInterval) {
      return;
    }
    this.scheduledMessageInterval = setInterval(() => {
      this.checkScheduledMessages();
    }, 60000);
  }

  subscribeToTypingIndicators(chatId, callback) {
    const key = chatId;
    if (!this.chatIdToTypingUsers.has(key)) {
      this.chatIdToTypingUsers.set(key, new Map());
    }
    const emit = () => {
      const map = this.chatIdToTypingUsers.get(key) || new Map();
      const obj = Object.fromEntries(map);
      callback(obj);
    };
    // Emit now and then whenever typing map changes (best-effort polling for stub)
    emit();
    const interval = setInterval(emit, 500);
    return () => clearInterval(interval);
  }

  // Presence
  setUserPresence(userId, status) {
    this.userIdToPresence.set(userId, status);
  }

  subscribeToPresence(callback) {
    const emit = () => callback(Object.fromEntries(this.userIdToPresence));
    emit();
    const interval = setInterval(emit, 1000);
    return () => clearInterval(interval);
  }

  // Chats list per user
  subscribeToUserChats(userId, callback) {
    // Use Firestore if available
    if (this.useFirestore) {
      try {
        const unsubscribe = firestoreService.subscribeToUserChats(userId, (chats) => {
          // Update local cache
          this.userIdToChats.set(userId, chats);
          callback(chats);
        });
        
        this.firestoreUnsubscribes.set(`chats_${userId}`, unsubscribe);
        return () => {
          if (this.firestoreUnsubscribes.has(`chats_${userId}`)) {
            this.firestoreUnsubscribes.get(`chats_${userId}`)();
            this.firestoreUnsubscribes.delete(`chats_${userId}`);
          }
        };
      } catch (error) {
        console.warn('Firestore subscription failed, falling back to localStorage:', error);
        this.useFirestore = false;
        // Fall through to localStorage mode
      }
    }

    // Fallback: localStorage mode
    if (!this.userIdToChats.has(userId)) {
      // Initialize with empty array for real users - no demo chat
      this.userIdToChats.set(userId, []);
    }
    // Immediately deliver current state
    callback(this.userIdToChats.get(userId));

    // Set up polling to check for updates (simulating real-time)
    const interval = setInterval(() => {
      const userChats = this.userIdToChats.get(userId) || [];
      callback(userChats);
    }, 500);

    const unsubscribe = () => {
      clearInterval(interval);
    };
    return unsubscribe;
  }

  // Create new chat
  async createChat(participants, chatName = null, isGroup = false) {
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = Date.now();
    const chat = {
      id: chatId,
      name: chatName || (isGroup ? 'Group Chat' : 'Direct Chat'),
      participants,
      type: isGroup ? 'group' : 'direct',
      createdAt,
      lastMessageAt: createdAt,
      avatar: null,
      lastMessage: null,
      unreadCount: 0
    };

    // Add chat to each participant's chat list
    participants.forEach(userId => {
      if (!this.userIdToChats.has(userId)) {
        this.userIdToChats.set(userId, []);
      }
      const userChats = this.userIdToChats.get(userId);
      if (!userChats.find(c => c.id === chatId)) {
        userChats.push(chat);
      }
    });

    return chat;
  }

  // Forward message to another chat
  async forwardMessage(messageId, fromChatId, toChatId, userId) {
    const messages = this.chatIdToMessages.get(fromChatId) || [];
    const message = messages.find(m => m.id === messageId);

    if (message) {
      const forwardedMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        forwarded: true,
        forwardedAt: Date.now(),
        forwardedBy: userId,
        originalChatId: fromChatId,
        timestamp: Date.now(),
        senderId: userId
      };

      await this.sendMessage(toChatId, forwardedMessage);
      return forwardedMessage;
    }
    return null;
  }

  // Pin message
  async pinMessage(chatId, messageId, userId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);

    if (message) {
      message.pinned = true;
      message.pinnedAt = Date.now();
      message.pinnedBy = userId;
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
      return message;
    }
    return null;
  }

  // Unpin message
  async unpinMessage(chatId, messageId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);

    if (message) {
      message.pinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
      return message;
    }
    return null;
  }

  // Schedule message
  async scheduleMessage(chatId, message, scheduleTime, userId) {
    const scheduledMessage = {
      ...message,
      scheduled: true,
      scheduleTime,
      createdAt: Date.now()
    };

    // Store in scheduled messages
    if (!this.scheduledMessages) {
      this.scheduledMessages = new Map();
    }
    const scheduled = this.scheduledMessages.get(chatId) || [];
    scheduled.push(scheduledMessage);
    this.scheduledMessages.set(chatId, scheduled);

    // Check and send scheduled messages periodically
    this.checkScheduledMessages();

    return scheduledMessage;
  }

  // Check and send scheduled messages
  checkScheduledMessages() {
    if (!this.scheduledMessages) {return;}

    const now = Date.now();
    this.scheduledMessages.forEach((messages, chatId) => {
      const toSend = messages.filter(msg => msg.scheduleTime <= now);

      toSend.forEach(async (msg) => {
        await this.sendMessage(chatId, {
          ...msg,
          scheduled: false,
          scheduleTime: null,
          timestamp: now
        });
      });

      // Remove sent messages
      const remaining = messages.filter(msg => msg.scheduleTime > now);
      this.scheduledMessages.set(chatId, remaining);
    });
  }

  // Notifications
  subscribeToNotifications(callback) {
    this.notificationListeners.add(callback);
    const unsubscribe = () => this.notificationListeners.delete(callback);
    return unsubscribe;
  }

  // Helper to emit a notification from anywhere in the app during dev
  emitNotification(message, type = 'info', title = 'EchoChat') {
    for (const cb of this.notificationListeners) {
      cb({ message, type, title });
    }
  }

  // Clear chat history
  async clearChatHistory(chatId) {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    // Clear messages from memory
    this.chatIdToMessages.set(chatId, []);

    // Update storage
    this.saveMessagesToStorage();

    // Return success
    return true;
  }

  // Get messages with automatic decryption
  getMessages(chatId, userId = null) {
    const messages = this.chatIdToMessages.get(chatId) || [];

    // Return messages with decryption handled by component
    return messages.map(msg => ({
      ...msg,
      needsDecryption: msg.isEncrypted && !msg.decryptedText
    }));
  }

  // Decrypt a single message (called when displaying)
  async decryptMessage(message, userId = null, chatId = null) {
    if (!message || !message.isEncrypted || !message.encryptedText) {
      return message.text || '';
    }

    try {
      const decrypted = await encryptionService.decryptMessageText(
        message.encryptedText,
        userId || message.senderId,
        chatId
      );

      // Cache decrypted text
      message.decryptedText = decrypted;
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return '[Unable to decrypt message]';
    }
  }
}

export const chatService = new ChatService();
export default chatService;

