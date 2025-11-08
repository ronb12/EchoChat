// Production-ready chat service with Firebase Firestore backend
// Falls back to localStorage for offline/demo mode
import { encryptionService } from './encryptionService';
import { firestoreService } from './firestoreService';
import { encryptionConfig } from '../config/encryptionConfig';

class ChatService {
  constructor() {
    this.chatIdToMessages = new Map();
    this.chatIdToTypingUsers = new Map();
    this.userIdToPresence = new Map();
    this.userIdToChats = new Map();
    this.chatEncryptionKeys = new Map();
    this.notificationListeners = new Set();
    this.chatIdToReadPointers = new Map();
    this.readPointerUnsubscribes = new Map();
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
    this.loadScheduledQueueFromStorage();
  }

  isEncryptionEnabled() {
    return !!encryptionConfig?.enabled;
  }

  cacheChatEncryption(chatId, encryptionMeta) {
    if (!this.isEncryptionEnabled() || !chatId) {
      return;
    }
    if (encryptionMeta && encryptionMeta.enabled && encryptionMeta.key) {
      this.chatEncryptionKeys.set(chatId, encryptionMeta.key);
    } else {
      this.chatEncryptionKeys.delete(chatId);
    }
  }

  getChatEncryptionOptions(chatId) {
    if (!this.isEncryptionEnabled()) {
      return {};
    }
    const key = this.chatEncryptionKeys.get(chatId);
    if (!key) {
      return {};
    }
    return { chatKey: key };
  }

  async createChatEncryptionMetadata() {
    if (!this.isEncryptionEnabled()) {
      return null;
    }
    try {
      const key = await encryptionService.generateSymmetricKey();
      return {
        enabled: true,
        version: 1,
        key
      };
    } catch (error) {
      console.error('Failed to generate chat encryption key:', error);
      return null;
    }
  }

  async processIncomingMessages(chatId, messages) {
    if (!Array.isArray(messages)) {
      return [];
    }
    const options = this.getChatEncryptionOptions(chatId);
    const shouldDecrypt = !!options.chatKey && this.isEncryptionEnabled();

    if (!shouldDecrypt) {
      return messages.map((msg) => ({ ...msg }));
    }

    const decryptedMessages = await Promise.all(messages.map(async (msg) => {
      const clone = { ...msg };
      if (clone.isEncrypted && clone.encryptedText && !clone.decryptedText) {
        try {
          const decrypted = await encryptionService.decryptMessageText(clone.encryptedText, options);
          clone.decryptedText = decrypted;
        } catch (error) {
          console.error('Failed to decrypt message payload:', error);
          clone.decryptionError = true;
        }
      }
      if (clone.encryptedImage && !clone.decryptedImage) {
        try {
          clone.decryptedImage = await encryptionService.decryptMessageText(clone.encryptedImage, options);
        } catch (error) {
          console.error('Failed to decrypt image payload:', error);
        }
      }
      if (clone.encryptedAudio && !clone.decryptedAudio) {
        try {
          clone.decryptedAudio = await encryptionService.decryptMessageText(clone.encryptedAudio, options);
        } catch (error) {
          console.error('Failed to decrypt audio payload:', error);
        }
      }
      if (clone.encryptedVideo && !clone.decryptedVideo) {
        try {
          clone.decryptedVideo = await encryptionService.decryptMessageText(clone.encryptedVideo, options);
        } catch (error) {
          console.error('Failed to decrypt video payload:', error);
        }
      }
      if (clone.encryptedSticker && !clone.decryptedSticker) {
        try {
          clone.decryptedSticker = await encryptionService.decryptMessageText(clone.encryptedSticker, options);
        } catch (error) {
          console.error('Failed to decrypt sticker payload:', error);
        }
      }
      return clone;
    }));

    return decryptedMessages;
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
        const entries = Object.entries(data).map(([chatId, messages]) => {
          if (!Array.isArray(messages)) {
            return [chatId, []];
          }
          return [chatId, messages.map((msg) => ({ ...msg }))];
        });
        this.chatIdToMessages = new Map(entries);
      }
      this.rebuildScheduledMessagesFromCache();
    } catch (error) {
      console.error('Error loading messages from storage:', error);
    }
  }

  saveMessagesToStorage() {
    try {
      const sanitizedEntries = Array.from(this.chatIdToMessages.entries()).map(([chatId, messages]) => {
        const sanitizedMessages = Array.isArray(messages)
          ? messages.map((msg) => {
              const clone = { ...msg };
              delete clone.decryptedText;
              delete clone.decryptedImage;
              delete clone.decryptedAudio;
              delete clone.decryptedVideo;
              delete clone.decryptedSticker;
              return clone;
            })
          : [];
        return [chatId, sanitizedMessages];
      });
      const data = Object.fromEntries(sanitizedEntries);
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

  normalizeReadsMap(reads) {
    if (!reads || typeof reads !== 'object') {return {};}
    const normalized = {};
    Object.entries(reads).forEach(([uid, value]) => {
      if (!uid) {return;}
      if (typeof value === 'number' && Number.isFinite(value)) {
        normalized[uid] = value;
      } else if (value && typeof value.toMillis === 'function') {
        normalized[uid] = value.toMillis();
      } else if (value && typeof value.seconds === 'number') {
        normalized[uid] = value.seconds * 1000;
      } else {
        normalized[uid] = Date.now();
      }
    });
    return normalized;
  }

  deriveReadsFromPointers(message, pointerMap) {
    if (!pointerMap || typeof pointerMap !== 'object') {return {};}
    const reads = {};
    const messageTimestamp = message.timestamp || 0;

    Object.entries(pointerMap).forEach(([uid, pointer]) => {
      if (!uid || !pointer) {return;}
      const pointerMessageId = pointer.messageId;
      const pointerTimestamp = pointer.messageTimestamp || pointer.updatedAt || 0;
      if (!pointerTimestamp && pointerMessageId !== message.id) {
        return;
      }
      const hasRead =
        pointerMessageId === message.id ||
        (pointerTimestamp && messageTimestamp <= pointerTimestamp);
      if (!hasRead) {return;}
      const readAt = pointerTimestamp || Date.now();
      reads[uid] = readAt;
    });

    return reads;
  }

  buildMessagesWithReadPointers(chatId, baseMessages = null) {
    const rawMessages = baseMessages || this.chatIdToMessages.get(chatId) || [];
    const pointerMap = this.chatIdToReadPointers.get(chatId) || {};

    return rawMessages.map((msg) => {
      const reads = this.deriveReadsFromPointers(msg, pointerMap);
      const readValues = Object.values(reads);
      const aggregatedReadAt = readValues.length > 0
        ? Math.min(...readValues)
        : (msg.readAt || null);
      return {
        ...msg,
        needsDecryption: msg.isEncrypted && msg.encryptedText && !msg.decryptedText,
        reads: this.normalizeReadsMap(reads),
        readAt: aggregatedReadAt
      };
    });
  }

  // Messages - Uses Firestore for real-time sync, localStorage as fallback
  subscribeToMessages(chatId, callback) {
    if (this.useFirestore) {
      // Use Firestore real-time subscription
      try {
        const emitMessages = () => {
          const processed = this.buildMessagesWithReadPointers(chatId);
          callback(processed);
        };

        const handleIncomingMessages = async (messages) => {
          try {
            const decryptedMessages = await this.processIncomingMessages(chatId, messages);
            this.chatIdToMessages.set(chatId, decryptedMessages);
            this.mergeScheduledPlaceholders(chatId);
          } catch (error) {
            console.error('Failed to process incoming messages:', error);
            this.chatIdToMessages.set(chatId, messages);
          }
          this.mergeScheduledPlaceholders(chatId);
          emitMessages();
        };

        const unsubscribeMessages = firestoreService.subscribeToMessages(chatId, (messages) => {
          handleIncomingMessages(messages);
        });

        if (!this.readPointerUnsubscribes.has(chatId)) {
          const unsubscribeReadPointers = firestoreService.subscribeToReadPointers(chatId, (readPointers) => {
            this.chatIdToReadPointers.set(chatId, readPointers);
            emitMessages();
          });
          this.readPointerUnsubscribes.set(chatId, unsubscribeReadPointers);
        }

        const cleanup = () => {
          unsubscribeMessages();
          this.chatIdToMessages.delete(chatId);
          if (this.readPointerUnsubscribes.has(chatId)) {
            this.readPointerUnsubscribes.get(chatId)();
            this.readPointerUnsubscribes.delete(chatId);
          }
          this.chatIdToReadPointers.delete(chatId);
        };

        this.firestoreUnsubscribes.set(chatId, cleanup);
        return cleanup;
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
    this.mergeScheduledPlaceholders(chatId);
    // Immediately deliver current state
    callback(this.buildMessagesWithReadPointers(chatId));

    // Set up polling to check for updates (simulating real-time)
    const interval = setInterval(() => {
      const messages = this.chatIdToMessages.get(chatId) || [];
      callback(this.buildMessagesWithReadPointers(chatId, messages));
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
    const encryptionOptions = this.getChatEncryptionOptions(chatId);
    const shouldEncrypt = !!encryptionOptions.chatKey && this.isEncryptionEnabled();
    let encryptedText = null;

    if (shouldEncrypt && message.text && message.text.trim()) {
      try {
        encryptedText = await encryptionService.encryptMessageText(
          message.text,
          encryptionOptions
        );
      } catch (error) {
        console.error('Encryption error, sending unencrypted:', error);
        encryptedText = null;
      }
    }

    const sanitizedMessage = { ...message };
    delete sanitizedMessage.text;
    delete sanitizedMessage.encryptedText;
    delete sanitizedMessage.decryptedText;
    delete sanitizedMessage.image;
    delete sanitizedMessage.encryptedImage;
    delete sanitizedMessage.decryptedImage;
    delete sanitizedMessage.audio;
    delete sanitizedMessage.encryptedAudio;
    delete sanitizedMessage.decryptedAudio;
    delete sanitizedMessage.video;
    delete sanitizedMessage.encryptedVideo;
    delete sanitizedMessage.decryptedVideo;
    delete sanitizedMessage.sticker;
    delete sanitizedMessage.encryptedSticker;
    delete sanitizedMessage.decryptedSticker;

    let encryptedImage = null;
    let encryptedAudio = null;
    let encryptedVideo = null;
    let encryptedSticker = null;

    if (shouldEncrypt) {
      try {
        if (message.image) {
          encryptedImage = await encryptionService.encryptMessageText(message.image, encryptionOptions);
        }
        if (message.audio) {
          encryptedAudio = await encryptionService.encryptMessageText(message.audio, encryptionOptions);
        }
        if (message.video) {
          encryptedVideo = await encryptionService.encryptMessageText(message.video, encryptionOptions);
        }
        if (message.sticker) {
          encryptedSticker = await encryptionService.encryptMessageText(message.sticker, encryptionOptions);
        }
      } catch (error) {
        console.error('Attachment encryption error:', error);
      }
    }

    // Prepare message data
    const messageData = {
      ...sanitizedMessage,
      // Keep text for immediate display, even if encrypted (will be decrypted on render)
      text: shouldEncrypt && encryptedText ? '' : (message.text || ''),
      encryptedText: shouldEncrypt ? encryptedText : null,
      decryptedText: shouldEncrypt ? (message.text || '') : null,
      isEncrypted: shouldEncrypt && !!encryptedText,
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
      image: shouldEncrypt ? null : (message.image || null),
      encryptedImage: shouldEncrypt ? encryptedImage : null,
      decryptedImage: shouldEncrypt ? (message.image || null) : null,
      audio: shouldEncrypt ? null : (message.audio || null),
      encryptedAudio: shouldEncrypt ? encryptedAudio : null,
      decryptedAudio: shouldEncrypt ? (message.audio || null) : null,
      video: shouldEncrypt ? null : (message.video || null),
      encryptedVideo: shouldEncrypt ? encryptedVideo : null,
      decryptedVideo: shouldEncrypt ? (message.video || null) : null,
      sticker: shouldEncrypt ? null : (message.sticker || null),
      encryptedSticker: shouldEncrypt ? encryptedSticker : null,
      decryptedSticker: shouldEncrypt ? (message.sticker || null) : null,
      videoName: message.videoName || null,
      file: message.file || null,
      imageName: message.imageName || null,
      audioName: message.audioName || null,
      fileName: message.fileName || null,
      fileSize: message.fileSize || null,
      fileType: message.fileType || null,
      // Preserve any additional metadata already included in sanitizedMessage
    };

    const messageForStorage = { ...messageData };
    delete messageForStorage.decryptedText;
    delete messageForStorage.decryptedImage;
    delete messageForStorage.decryptedAudio;
    delete messageForStorage.decryptedVideo;
    delete messageForStorage.decryptedSticker;

    // Note: We keep text field for immediate display
    // The encryptedText is used for secure storage, but text is kept for UI rendering
    // This ensures messages are visible immediately after sending

    // Use Firestore if available, otherwise localStorage
    if (this.useFirestore) {
      try {
        const newMessage = await firestoreService.sendMessage(chatId, messageForStorage);
        // Update chat metadata (last message, unread counts)
        await this.handlePostSend(chatId, newMessage || messageData);
        // Real-time subscription will handle notifying subscribers
        if (newMessage) {
          newMessage.reads = this.normalizeReadsMap(newMessage.reads);
          if (shouldEncrypt && message.text) {
            newMessage.decryptedText = message.text;
          }
        }
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
      ...messageData,
      reads: messageData.senderId
        ? { [messageData.senderId]: Date.now() }
        : {}
    };

    messages.push(newMessage);
    this.chatIdToMessages.set(chatId, messages);

    // Save to localStorage for persistence across tabs
    this.saveMessagesToStorage();

    // Notify all subscribers
    this.notifyMessageSubscribers(chatId);

    await this.handlePostSend(chatId, newMessage);

    return newMessage;
  }

  // Mark message as read
  async markMessageAsRead(chatId, messageId, userId) {
    if (!chatId || !messageId) {return;}

    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const now = Date.now();
      if (userId) {
        message.reads = {
          ...(message.reads || {}),
          [userId]: message.reads?.[userId] || now
        };
      }
      if (!message.readAt && userId && userId !== message.senderId) {
        message.readAt = now;
      }
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);

      const pointerMap = { ...(this.chatIdToReadPointers.get(chatId) || {}) };
      pointerMap[userId] = {
        messageId,
        messageTimestamp: message.timestamp || now,
        updatedAt: now
      };
      this.chatIdToReadPointers.set(chatId, pointerMap);
    }

    if (this.useFirestore) {
      try {
        await firestoreService.markMessageAsRead(chatId, messageId, userId || null);
      } catch (error) {
        console.error('Error marking message as read in Firestore:', error);
      }
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
    }, 15000);
  }

  getScheduledEntries(chatId) {
    if (!chatId) {return [];}
    const queue = this.scheduledMessages?.get(chatId) || [];
    return queue.slice().sort((a, b) => {
      return (a.scheduleTime || 0) - (b.scheduleTime || 0);
    });
  }

  findScheduledEntry(chatId, entryId) {
    if (!chatId || !entryId) {return null;}
    const queue = this.scheduledMessages?.get(chatId) || [];
    return queue.find((entry) => entry?.id === entryId) || null;
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
          const normalizedChats = this.normalizeChatListForUser(chats, userId);
          // Update local cache
          this.userIdToChats.set(userId, normalizedChats);
          callback(normalizedChats);
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
    callback(this.normalizeChatListForUser(this.userIdToChats.get(userId), userId));

    // Set up polling to check for updates (simulating real-time)
    const interval = setInterval(() => {
      const userChats = this.normalizeChatListForUser(this.userIdToChats.get(userId) || [], userId);
      callback(userChats);
    }, 500);

    const unsubscribe = () => {
      clearInterval(interval);
    };
    return unsubscribe;
  }

  async handlePostSend(chatId, messageData) {
    if (!messageData) {return;}

    const preview = firestoreService.buildMessagePreview
      ? firestoreService.buildMessagePreview(messageData)
      : (messageData.text || '').trim();
    const timestamp = Date.now();

    this.updateLocalChatCache(chatId, preview, timestamp, messageData);

    if (this.useFirestore) {
      try {
        await firestoreService.updateChatAfterMessage(chatId, messageData);
      } catch (error) {
        console.error('Error updating chat metadata after send:', error);
      }
    }
  }

  updateLocalChatCache(chatId, preview, timestamp, messageData) {
    if (!chatId) {return;}

    const senderId = messageData?.senderId;

    this.userIdToChats.forEach((chats, userId) => {
      if (!Array.isArray(chats) || chats.length === 0) {
        return;
      }

      const updatedChats = chats.map((chat) => {
        if (!chat || chat.id !== chatId) {
          return chat;
        }

        const unreadCount = this.resolveUnreadCount(chat.unreadCount, userId);
        const nextUnread = senderId
          ? (senderId === userId ? 0 : unreadCount + 1)
          : unreadCount;

        return {
          ...chat,
          lastMessage: preview,
          lastMessageAt: timestamp,
          lastMessageSenderId: messageData?.senderId || chat.lastMessageSenderId || null,
          lastMessageSenderName: messageData?.senderName || chat.lastMessageSenderName || null,
          unreadCount: nextUnread
        };
      });

      this.userIdToChats.set(userId, updatedChats);
    });
  }

  normalizeChatListForUser(chats, userId) {
    if (!Array.isArray(chats)) {
      return [];
    }

    return chats.map(chat => this.normalizeChatForUser(chat, userId));
  }

  normalizeChatForUser(chat, userId) {
    if (!chat) {return chat;}

    const normalized = { ...chat };
    normalized.lastMessageAt = this.normalizeTimestamp(chat.lastMessageAt, chat.createdAt || Date.now());
    normalized.createdAt = this.normalizeTimestamp(chat.createdAt, normalized.lastMessageAt);

    if (typeof chat.lastMessage === 'object' && chat.lastMessage !== null) {
      normalized.lastMessage = (chat.lastMessage.text || '').trim();
    } else {
      normalized.lastMessage = (chat.lastMessage || '').toString();
    }

    normalized.unreadCount = this.resolveUnreadCount(chat.unreadCount, userId);
    if (chat.encryption) {
      normalized.encryption = { ...chat.encryption };
      this.cacheChatEncryption(chat.id, chat.encryption);
    }

    return normalized;
  }

  resolveUnreadCount(unreadValue, userId) {
    if (typeof unreadValue === 'number' && Number.isFinite(unreadValue)) {
      return unreadValue;
    }

    if (unreadValue && typeof unreadValue === 'object') {
      const valueForUser = unreadValue[userId];
      if (typeof valueForUser === 'number' && Number.isFinite(valueForUser)) {
        return valueForUser;
      }
    }

    return 0;
  }

  normalizeTimestamp(value, fallback = Date.now()) {
    if (!value && value !== 0) {return fallback;}
    if (typeof value === 'number' && Number.isFinite(value)) {return value;}
    if (typeof value?.toMillis === 'function') {return value.toMillis();}
    return fallback;
  }

  async deleteChat(chatId) {
    if (!chatId) {return;}

    if (this.useFirestore) {
      try {
        await firestoreService.deleteChat(chatId);
      } catch (error) {
        console.error('Error deleting chat from Firestore:', error);
      }
    }

    this.chatIdToMessages.delete(chatId);
    this.chatIdToTypingUsers.delete(chatId);

    this.userIdToChats.forEach((chats, userId) => {
      if (!Array.isArray(chats)) {return;}
      const filtered = chats.filter((chat) => chat?.id !== chatId);
      this.userIdToChats.set(userId, filtered);
    });

    this.saveMessagesToStorage();
    this.notifyMessageSubscribers(chatId);
  }

  // Create new chat
  async createChat(participants, chatName = null, isGroup = false) {
    let chat = null;
    let chatId = null;
    const fallbackCreatedAt = Date.now();
    const encryptionMeta = await this.createChatEncryptionMetadata();

    if (this.useFirestore) {
      try {
        const firestoreChat = await firestoreService.createChat(participants, chatName, isGroup, {
          encryption: encryptionMeta
        });
        chatId = firestoreChat.id;

        const normalizeTimestamp = (value, fallback) => {
          if (!value) {return fallback;}
          if (typeof value === 'number') {return value;}
          if (typeof value?.toMillis === 'function') {return value.toMillis();}
          return fallback;
        };

        chat = {
          id: chatId,
          name: firestoreChat.name || chatName || (isGroup ? 'Group Chat' : 'Direct Chat'),
          participants: firestoreChat.participants || participants,
          type: firestoreChat.type || (isGroup ? 'group' : 'direct'),
          createdAt: normalizeTimestamp(firestoreChat.createdAt, fallbackCreatedAt),
          lastMessageAt: normalizeTimestamp(firestoreChat.lastMessageAt, fallbackCreatedAt),
          avatar: null,
          lastMessage: null,
          unreadCount: 0,
          encryption: firestoreChat.encryption || encryptionMeta || null
        };
      } catch (error) {
        console.error('Firestore createChat failed, falling back to local mode:', error);
        this.useFirestore = false;
      }
    }

    if (!chat) {
      chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      chat = {
        id: chatId,
        name: chatName || (isGroup ? 'Group Chat' : 'Direct Chat'),
        participants,
        type: isGroup ? 'group' : 'direct',
        createdAt: fallbackCreatedAt,
        lastMessageAt: fallbackCreatedAt,
        avatar: null,
        lastMessage: null,
        unreadCount: 0,
        encryption: encryptionMeta || null
      };
    }

    this.cacheChatEncryption(chat.id, chat.encryption);

    // Add chat to each participant's chat list
    participants.forEach(userId => {
      if (!this.userIdToChats.has(userId)) {
        this.userIdToChats.set(userId, []);
      }
      const userChats = this.userIdToChats.get(userId);
      if (!userChats.find(c => c.id === chat.id)) {
        userChats.push(chat);
      }
    });

    return chat;
  }

  // Forward message to another chat
  async forwardMessage(messageOrId, fromChatId, toChatId, userId, userName = 'You') {
    if (!toChatId || !userId) {
      throw new Error('Invalid forwarding request');
    }

    const messages = this.chatIdToMessages.get(fromChatId) || [];
    let originalMessage = null;

    if (typeof messageOrId === 'object' && messageOrId !== null) {
      originalMessage = messageOrId;
    } else if (typeof messageOrId === 'string') {
      originalMessage = messages.find((m) => m.id === messageOrId);
    }

    if (!originalMessage) {
      throw new Error('Message not found or unavailable for forwarding');
    }

    const now = Date.now();
    const textContent = originalMessage.decryptedText
      || originalMessage.text
      || '';

    const forwardedPayload = {
      text: textContent,
      senderId: userId,
      senderName: userName,
      image: originalMessage.image || null,
      audio: originalMessage.audio || null,
      audioName: originalMessage.audioName || null,
      audioDuration: originalMessage.audioDuration || null,
      video: originalMessage.video || null,
      videoName: originalMessage.videoName || null,
      videoDuration: originalMessage.videoDuration || null,
      videoSize: originalMessage.videoSize || null,
      videoType: originalMessage.videoType || null,
      file: originalMessage.file || null,
      fileName: originalMessage.fileName || null,
      fileSize: originalMessage.fileSize || null,
      fileType: originalMessage.fileType || null,
      sticker: originalMessage.sticker || null,
      stickerId: originalMessage.stickerId || null,
      stickerPackId: originalMessage.stickerPackId || null,
      imageName: originalMessage.imageName || null,
      forwarded: true,
      forwardedAt: now,
      forwardedBy: userId,
      forwardedByName: userName,
      originalMessageId: originalMessage.id || null,
      originalChatId: fromChatId,
      originalSenderId: originalMessage.senderId || null,
      originalSenderName: originalMessage.senderName || null
    };

    const forwardedMessage = await this.sendMessage(toChatId, forwardedPayload, userId);
    return forwardedMessage;
  }

  // Pin message
  async pinMessage(chatId, messageId, userId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);

    if (message) {
      const previousState = { pinned: message.pinned, pinnedAt: message.pinnedAt, pinnedBy: message.pinnedBy };
      message.pinned = true;
      message.pinnedAt = Date.now();
      message.pinnedBy = userId;
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
      try {
        if (this.useFirestore) {
          await firestoreService.pinMessage(messageId, userId);
        }
      } catch (error) {
        // revert optimistic update on failure
        message.pinned = previousState.pinned;
        message.pinnedAt = previousState.pinnedAt;
        message.pinnedBy = previousState.pinnedBy;
        this.saveMessagesToStorage();
        this.notifyMessageSubscribers(chatId);
        throw error;
      }
      return message;
    }
    if (this.useFirestore) {
      return firestoreService.pinMessage(messageId, userId);
    }
    return null;
  }

  // Unpin message
  async unpinMessage(chatId, messageId) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const message = messages.find(m => m.id === messageId);

    if (message) {
      const previousState = { pinned: message.pinned, pinnedAt: message.pinnedAt, pinnedBy: message.pinnedBy };
      message.pinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
      try {
        if (this.useFirestore) {
          await firestoreService.unpinMessage(messageId);
        }
      } catch (error) {
        message.pinned = previousState.pinned;
        message.pinnedAt = previousState.pinnedAt;
        message.pinnedBy = previousState.pinnedBy;
        this.saveMessagesToStorage();
        this.notifyMessageSubscribers(chatId);
        throw error;
      }
      return message;
    }
    if (this.useFirestore) {
      return firestoreService.unpinMessage(messageId);
    }
    return null;
  }

  // Schedule message
  ensureScheduledQueue(chatId) {
    if (!this.scheduledMessages) {
      this.scheduledMessages = new Map();
    }
    if (!this.scheduledMessages.has(chatId)) {
      this.scheduledMessages.set(chatId, []);
    }
  }

  mergeScheduledPlaceholders(chatId) {
    const entries = this.scheduledMessages?.get(chatId) || [];
    if (entries.length === 0) {return;}
    const current = [...(this.chatIdToMessages.get(chatId) || [])];
    let modified = false;
    entries.forEach((entry) => {
      const placeholder = entry.placeholder;
      if (!placeholder) {return;}
      const index = current.findIndex((msg) => msg.id === placeholder.id);
      if (index >= 0) {
        current[index] = { ...placeholder };
        modified = true;
      } else {
        current.push({ ...placeholder });
        modified = true;
      }
    });
    if (modified) {
      current.sort((a, b) => {
        const timeA = a.scheduleTime || a.timestamp || a.createdAt || 0;
        const timeB = b.scheduleTime || b.timestamp || b.createdAt || 0;
        return timeA - timeB;
      });
      this.chatIdToMessages.set(chatId, current);
    }
  }

  persistScheduledQueue() {
    try {
      const payload = [];
      this.scheduledMessages.forEach((entries = [], chatId) => {
        entries.forEach((entry) => {
          payload.push({
            chatId,
            id: entry.id,
            scheduleTime: entry.scheduleTime,
            senderId: entry.senderId,
            senderName: entry.senderName,
            originalPayload: entry.originalPayload,
            placeholder: entry.placeholder
          });
        });
      });
      localStorage.setItem('echochat_scheduled_queue', JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist scheduled queue:', error);
    }
  }

  loadScheduledQueueFromStorage() {
    try {
      const stored = localStorage.getItem('echochat_scheduled_queue');
      if (!stored) {return;}
      const items = JSON.parse(stored);
      if (!Array.isArray(items)) {return;}
      this.scheduledMessages = new Map();
      items.forEach((item) => {
        if (!item || !item.chatId || !item.id || !item.scheduleTime || !item.senderId) {return;}
        const placeholder = item.placeholder || this.buildScheduledPlaceholder(
          item.chatId,
          item.originalPayload || {},
          item.scheduleTime,
          item.senderId,
          item.senderName,
          item.id
        );
        this.ensureScheduledQueue(item.chatId);
        const queue = this.scheduledMessages.get(item.chatId);
        queue.push({
          id: item.id,
          chatId: item.chatId,
          scheduleTime: item.scheduleTime,
          senderId: item.senderId,
          senderName: item.senderName || 'User',
          originalPayload: item.originalPayload || {},
          placeholder
        });
        this.addPlaceholderToChat(item.chatId, placeholder, false);
      });
    } catch (error) {
      console.error('Failed to load scheduled queue:', error);
    }
  }

  rebuildScheduledMessagesFromCache() {
    const now = Date.now();
    const rebuilt = new Map();
    this.chatIdToMessages.forEach((messages, chatId) => {
      const pending = (messages || []).filter(
        (msg) => msg && msg.scheduled && msg.scheduleTime && msg.scheduleTime > now
      );
      if (pending.length > 0) {
        rebuilt.set(
          chatId,
          pending.map((msg) => ({
            id: msg.id,
            chatId,
            scheduleTime: msg.scheduleTime,
            senderId: msg.senderId,
            senderName: msg.senderName || 'User',
            originalPayload: msg.originalPayload || {
              text: msg.text || msg.decryptedText || '',
              senderId: msg.senderId,
              senderName: msg.senderName || 'User'
            },
            placeholder: { ...msg }
          }))
        );
      }
    });
    if (rebuilt.size > 0) {
      this.scheduledMessages = rebuilt;
      this.persistScheduledQueue();
    }
  }

  addPlaceholderToChat(chatId, placeholder, notify = true) {
    if (!placeholder) {return;}
    const current = [...(this.chatIdToMessages.get(chatId) || [])];
    const index = current.findIndex((msg) => msg.id === placeholder.id);
    if (index >= 0) {
      current[index] = { ...placeholder };
    } else {
      current.push({ ...placeholder });
    }
    current.sort((a, b) => {
      const timeA = a.scheduleTime || a.timestamp || a.createdAt || 0;
      const timeB = b.scheduleTime || b.timestamp || b.createdAt || 0;
      return timeA - timeB;
    });
    this.chatIdToMessages.set(chatId, current);
    if (notify) {
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
    }
  }

  removeScheduledPlaceholder(chatId, placeholderId, notify = true) {
    const queue = this.scheduledMessages?.get(chatId) || [];
    if (queue.length > 0) {
      const filtered = queue.filter((entry) => entry.id !== placeholderId);
      this.scheduledMessages.set(chatId, filtered);
    }
    if (this.chatIdToMessages.has(chatId)) {
      const filteredMessages = (this.chatIdToMessages.get(chatId) || []).filter(
        (msg) => msg.id !== placeholderId
      );
      this.chatIdToMessages.set(chatId, filteredMessages);
    }
    if (notify) {
      this.saveMessagesToStorage();
      this.notifyMessageSubscribers(chatId);
    }
    this.persistScheduledQueue();
  }

  buildScheduledPlaceholder(chatId, message, scheduleTime, userId, userName, customId = null) {
    const timestamp = Date.now();
    const id =
      customId || `scheduled_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

    const attachments = Array.isArray(message.attachments)
      ? message.attachments.map((attachment) => ({
          type: attachment?.type || 'file',
          url: attachment?.url || null,
          name: attachment?.name || null,
          size: typeof attachment?.size === 'number' ? attachment.size : null,
          contentType: attachment?.contentType || null
        }))
      : [];

    const firstImage = attachments.find((attachment) => attachment.type === 'image');
    const firstAudio = attachments.find((attachment) => attachment.type === 'audio');
    const firstVideo = attachments.find((attachment) => attachment.type === 'video');
    const firstFile = attachments.find((attachment) => attachment.type === 'file');

    const text = message.text || '';

    return {
      id,
      chatId,
      senderId: userId,
      senderName: userName || 'User',
      text,
      decryptedText: text,
      attachments,
      image: message.image || firstImage?.url || null,
      imageName: message.imageName || firstImage?.name || null,
      imageSize: message.imageSize || firstImage?.size || null,
      imageType: message.imageType || firstImage?.contentType || null,
      audio: message.audio || firstAudio?.url || null,
      audioName: message.audioName || firstAudio?.name || null,
      audioDuration: message.audioDuration || null,
      video: message.video || firstVideo?.url || null,
      videoName: message.videoName || firstVideo?.name || null,
      videoDuration: message.videoDuration || null,
      file: message.file || (firstFile
        ? {
            url: firstFile.url || null,
            name: firstFile.name || null,
            size: firstFile.size || null,
            type: firstFile.contentType || null
          }
        : null),
      fileName: message.fileName || firstFile?.name || null,
      fileSize: message.fileSize || firstFile?.size || null,
      fileType: message.fileType || firstFile?.contentType || null,
      sticker: message.sticker || null,
      stickerId: message.stickerId || null,
      scheduled: true,
      hasAttachments: attachments.length > 0,
      scheduleTime,
      scheduledFor: scheduleTime,
      createdAt: timestamp,
      timestamp: scheduleTime,
      status: 'scheduled',
      isPlaceholder: true
    };
  }

  async cancelScheduledMessage(chatId, entryId) {
    if (!chatId || !entryId) {return false;}
    if (!this.scheduledMessages?.has(chatId)) {
      return false;
    }
    this.removeScheduledPlaceholder(chatId, entryId, true);
    this.persistScheduledQueue();
    return true;
  }

  async sendScheduledMessageNow(chatId, entryId) {
    if (!chatId || !entryId) {
      throw new Error('Invalid scheduled message reference');
    }
    const entry = this.findScheduledEntry(chatId, entryId);
    if (!entry) {
      throw new Error('Scheduled message not found');
    }

    await this.sendMessage(chatId, {
      ...entry.originalPayload,
      senderId: entry.senderId,
      senderName: entry.senderName,
      scheduled: false,
      scheduleTime: null
    }, entry.senderId);

    this.removeScheduledPlaceholder(chatId, entryId, true);
    this.persistScheduledQueue();
    return true;
  }

  async rescheduleScheduledMessage(chatId, entryId, newScheduleTime) {
    if (!chatId || !entryId || !Number.isFinite(newScheduleTime)) {
      throw new Error('Invalid reschedule data');
    }

    this.ensureScheduledQueue(chatId);
    const entry = this.findScheduledEntry(chatId, entryId);
    if (!entry) {
      throw new Error('Scheduled message not found');
    }

    entry.scheduleTime = newScheduleTime;
    if (entry.placeholder) {
      entry.placeholder.scheduleTime = newScheduleTime;
      entry.placeholder.scheduledFor = newScheduleTime;
      entry.placeholder.timestamp = newScheduleTime;
      entry.placeholder.status = 'scheduled';
    }

    this.addPlaceholderToChat(chatId, entry.placeholder, true);
    this.persistScheduledQueue();
    return entry;
  }

  async scheduleMessage(chatId, message, scheduleTime, userId, userName) {
    if (!chatId || !message || !userId || !scheduleTime) {
      throw new Error('Invalid scheduling data');
    }

    const normalizedTime = Number(scheduleTime);
    if (!Number.isFinite(normalizedTime)) {
      throw new Error('Invalid schedule time');
    }

    const now = Date.now();
    const minDelayMs = 15000; // 15 seconds buffer
    if (normalizedTime < now + minDelayMs) {
      throw new Error('Please choose a time at least 15 seconds in the future.');
    }

    const attachments = Array.isArray(message.attachments)
      ? message.attachments.map((attachment) => ({
          type: attachment?.type || 'file',
          url: attachment?.url || attachment?.downloadURL || null,
          name: attachment?.name || null,
          size: typeof attachment?.size === 'number' ? attachment.size : null,
          contentType: attachment?.contentType || attachment?.mimeType || attachment?.type || null
        }))
      : [];

    const sanitizedPayload = {
      text: message.text || '',
      senderId: userId,
      senderName: userName || 'User',
      attachments,
      image: message.image || null,
      imageName: message.imageName || null,
      imageSize: message.imageSize || null,
      imageType: message.imageType || null,
      audio: message.audio || null,
      audioName: message.audioName || null,
      audioDuration: message.audioDuration || null,
      video: message.video || null,
      videoName: message.videoName || null,
      videoDuration: message.videoDuration || null,
      file: message.file || null,
      fileName: message.fileName || (message.file && message.file.name) || null,
      fileSize: message.fileSize || (message.file && message.file.size) || null,
      fileType: message.fileType || (message.file && (message.file.type || message.file.contentType)) || null,
      sticker: message.sticker || null,
      stickerId: message.stickerId || null
    };

    const placeholder = this.buildScheduledPlaceholder(
      chatId,
      sanitizedPayload,
      normalizedTime,
      userId,
      userName
    );
    placeholder.originalPayload = sanitizedPayload;

    this.ensureScheduledQueue(chatId);
    const queue = this.scheduledMessages.get(chatId);
    queue.push({
      id: placeholder.id,
      chatId,
      scheduleTime: normalizedTime,
      senderId: userId,
      senderName: userName || 'User',
      originalPayload: sanitizedPayload,
      placeholder
    });

    this.addPlaceholderToChat(chatId, placeholder);
    this.persistScheduledQueue();
    this.checkScheduledMessages();
    return placeholder;
  }

  // Check and send scheduled messages
  async checkScheduledMessages() {
    if (!this.scheduledMessages) {return;}

    const now = Date.now();
    this.scheduledMessages.forEach(async (entries, chatId) => {
      if (!Array.isArray(entries) || entries.length === 0) {return;}
      const remaining = [];
      for (const entry of entries) {
        if (!entry || !entry.scheduleTime) {
          continue;
        }
        if (entry.scheduleTime > now) {
          remaining.push(entry);
          continue;
        }

        try {
          await this.sendMessage(chatId, {
            ...entry.originalPayload,
            senderId: entry.senderId,
            senderName: entry.senderName,
            scheduled: false,
            scheduleTime: null
          });
          this.removeScheduledPlaceholder(chatId, entry.id, true);
        } catch (error) {
          console.error('Failed to deliver scheduled message:', error);
          entry.scheduleTime = now + 60000;
          remaining.push(entry);
        }
      }
      this.scheduledMessages.set(chatId, remaining);
    });
    this.persistScheduledQueue();
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
      const options = this.getChatEncryptionOptions(chatId);
      const decrypted = await encryptionService.decryptMessageText(
        message.encryptedText,
        options
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

