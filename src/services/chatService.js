// Minimal in-memory chat service to support runtime in dev
// Uses localStorage to persist messages across tabs

class ChatService {
  constructor() {
    this.chatIdToMessages = new Map();
    this.chatIdToTypingUsers = new Map();
    this.userIdToPresence = new Map();
    this.userIdToChats = new Map();
    this.notificationListeners = new Set();
    
    // Load messages from localStorage on init
    this.loadMessagesFromStorage();
    
    // Listen for storage changes (for cross-tab communication)
    window.addEventListener('storage', (e) => {
      if (e.key === 'echochat_messages') {
        this.loadMessagesFromStorage();
        this.notifyAllSubscribers();
      }
    });
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

  // Messages
  subscribeToMessages(chatId, callback) {
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

  // Send a message
  async sendMessage(chatId, message) {
    const messages = this.chatIdToMessages.get(chatId) || [];
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: message.text,
      senderId: message.senderId,
      senderName: message.senderName,
      timestamp: Date.now(),
      deliveredAt: Date.now(), // Message delivered immediately
      readAt: null, // Will be set when read
      reactions: {}, // { emoji: [userId1, userId2, ...] }
      edited: false,
      editedAt: null,
      deleted: false,
      deletedAt: null,
      deletedForEveryone: false,
      ...message // Allow additional fields like image, file, etc.
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
  markMessageAsRead(chatId, messageId, userId) {
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
      if (!message.reactions) message.reactions = {};
      if (!message.reactions[emoji]) message.reactions[emoji] = [];
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
  editMessage(chatId, messageId, newText, userId) {
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
  deleteMessage(chatId, messageId, userId, forEveryone = false) {
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
    if (!this.userIdToChats.has(userId)) {
      // Provide a default sample chat for demo
      this.userIdToChats.set(userId, [
        { id: 'demo', name: 'Demo Chat', lastMessageAt: Date.now() }
      ]);
    }
    callback(this.userIdToChats.get(userId));
    const unsubscribe = () => {
      // no-op for stub
    };
    return unsubscribe;
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
}

export const chatService = new ChatService();
export default chatService;

