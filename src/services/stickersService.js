// Stickers Service - Sticker packs and management
import { db } from './firebaseConfig';
import { collection, doc, setDoc, getDocs, increment, query, where, orderBy, limit } from 'firebase/firestore';
import { chatService } from './chatService';

class StickersService {
  constructor() {
    this.stickerPacks = new Map();
    this.defaultStickers = this.initDefaultStickers();
  }

  // Initialize default sticker packs
  initDefaultStickers() {
    return [
      {
        id: 'default-emoji',
        name: 'Emoji',
        icon: '😀',
        stickers: [
          { id: 'smile', emoji: '😀', keywords: ['happy', 'smile', 'joy'] },
          { id: 'laugh', emoji: '😂', keywords: ['laugh', 'funny', 'tears'] },
          { id: 'heart', emoji: '❤️', keywords: ['love', 'heart', 'like'] },
          { id: 'fire', emoji: '🔥', keywords: ['fire', 'hot', 'amazing'] },
          { id: 'thumbs-up', emoji: '👍', keywords: ['thumbs', 'up', 'good'] },
          { id: 'clap', emoji: '👏', keywords: ['clap', 'applause', 'great'] },
          { id: 'party', emoji: '🎉', keywords: ['party', 'celebration', 'yay'] },
          { id: 'star', emoji: '⭐', keywords: ['star', 'favorite', 'best'] },
          { id: 'ok', emoji: '👌', keywords: ['ok', 'good', 'perfect'] },
          { id: 'cool', emoji: '😎', keywords: ['cool', 'awesome', 'swag'] },
          { id: 'thinking', emoji: '🤔', keywords: ['think', 'hmm', 'wonder'] },
          { id: 'shrug', emoji: '🤷', keywords: ['shrug', 'dunno', 'whatever'] }
        ]
      },
      {
        id: 'reactions',
        name: 'Reactions',
        icon: '😊',
        stickers: [
          { id: 'love', emoji: '🥰', keywords: ['love', 'adore', 'cute'] },
          { id: 'kiss', emoji: '😘', keywords: ['kiss', 'love', 'muah'] },
          { id: 'wink', emoji: '😉', keywords: ['wink', 'hint', 'secret'] },
          { id: 'blush', emoji: '😊', keywords: ['blush', 'shy', 'happy'] },
          { id: 'wow', emoji: '🤩', keywords: ['wow', 'amazed', 'star'] },
          { id: 'sad', emoji: '😢', keywords: ['sad', 'cry', 'upset'] },
          { id: 'angry', emoji: '😠', keywords: ['angry', 'mad', 'furious'] },
          { id: 'sleepy', emoji: '😴', keywords: ['sleep', 'tired', 'zzz'] },
          { id: 'sick', emoji: '🤒', keywords: ['sick', 'ill', 'fever'] },
          { id: 'celebrate', emoji: '🎊', keywords: ['celebrate', 'party', 'yay'] }
        ]
      },
      {
        id: 'animals',
        name: 'Animals',
        icon: '🐱',
        stickers: [
          { id: 'cat', emoji: '🐱', keywords: ['cat', 'meow', 'kitten'] },
          { id: 'dog', emoji: '🐶', keywords: ['dog', 'puppy', 'woof'] },
          { id: 'bear', emoji: '🐻', keywords: ['bear', 'cute', 'hug'] },
          { id: 'panda', emoji: '🐼', keywords: ['panda', 'cute', 'bamboo'] },
          { id: 'monkey', emoji: '🐵', keywords: ['monkey', 'banana', 'fun'] },
          { id: 'lion', emoji: '🦁', keywords: ['lion', 'king', 'roar'] },
          { id: 'tiger', emoji: '🐯', keywords: ['tiger', 'stripes', 'wild'] },
          { id: 'rabbit', emoji: '🐰', keywords: ['rabbit', 'bunny', 'hop'] },
          { id: 'fox', emoji: '🦊', keywords: ['fox', 'clever', 'red'] },
          { id: 'owl', emoji: '🦉', keywords: ['owl', 'wise', 'night'] }
        ]
      },
      {
        id: 'food',
        name: 'Food',
        icon: '🍕',
        stickers: [
          { id: 'pizza', emoji: '🍕', keywords: ['pizza', 'cheese', 'slice'] },
          { id: 'burger', emoji: '🍔', keywords: ['burger', 'food', 'yum'] },
          { id: 'taco', emoji: '🌮', keywords: ['taco', 'mexican', 'food'] },
          { id: 'sushi', emoji: '🍣', keywords: ['sushi', 'japanese', 'fish'] },
          { id: 'cake', emoji: '🎂', keywords: ['cake', 'birthday', 'sweet'] },
          { id: 'coffee', emoji: '☕', keywords: ['coffee', 'caffeine', 'mug'] },
          { id: 'beer', emoji: '🍺', keywords: ['beer', 'drink', 'cheers'] },
          { id: 'ice-cream', emoji: '🍦', keywords: ['ice', 'cream', 'cold'] },
          { id: 'donut', emoji: '🍩', keywords: ['donut', 'sweet', 'glazed'] },
          { id: 'popcorn', emoji: '🍿', keywords: ['popcorn', 'movie', 'snack'] }
        ]
      }
    ];
  }

  // Get all sticker packs
  async getStickerPacks() {
    try {
      // Load from Firestore if available
      const packsRef = collection(db, 'stickerPacks');
      const snapshot = await getDocs(packsRef);

      const packs = [];
      snapshot.forEach(doc => {
        packs.push({ id: doc.id, ...doc.data() });
      });

      // Merge with default stickers
      const allPacks = [...this.defaultStickers, ...packs];
      return allPacks;
    } catch (error) {
      console.error('Error loading sticker packs, using defaults:', error);
      return this.defaultStickers;
    }
  }

  // Get stickers from a specific pack
  getStickersFromPack(packId) {
    const pack = this.defaultStickers.find(p => p.id === packId);
    return pack ? pack.stickers : [];
  }

  // Search stickers by keyword
  async searchStickers(query) {
    const queryLower = query.toLowerCase();
    const allPacks = await this.getStickerPacks();
    const results = [];

    allPacks.forEach(pack => {
      pack.stickers.forEach(sticker => {
        const matches = sticker.keywords.some(keyword =>
          keyword.toLowerCase().includes(queryLower)
        );
        if (matches || sticker.emoji.includes(query)) {
          results.push({ ...sticker, packId: pack.id, packName: pack.name });
        }
      });
    });

    return results;
  }

  // Track sticker usage (analytics)
  async trackStickerUsage(userId, stickerId, packId) {
    try {
      const usageRef = doc(db, 'stickerUsage', `${userId}_${stickerId}`);
      await setDoc(usageRef, {
        userId,
        stickerId,
        packId,
        usageCount: increment(1),
        lastUsed: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error tracking sticker usage:', error);
      // Non-critical, don't throw
    }
  }

  // Get frequently used stickers for a user
  async getFrequentlyUsed(userId, limit = 12) {
    try {
      const usageRef = collection(db, 'stickerUsage');
      const q = query(
        usageRef,
        where('userId', '==', userId),
        orderBy('usageCount', 'desc'),
        limit(limit)
      );
      const snapshot = await getDocs(q);

      const frequent = [];
      snapshot.forEach(doc => {
        frequent.push(doc.data());
      });

      return frequent;
    } catch (error) {
      console.error('Error getting frequently used stickers:', error);
      return [];
    }
  }

  // Send sticker as message
  async sendSticker(chatId, userId, senderName, sticker) {
    const messageData = {
      senderId: userId,
      senderName: senderName,
      sticker: sticker.emoji,
      stickerId: sticker.id,
      stickerPackId: sticker.packId,
      text: '', // Stickers don't need text
      timestamp: Date.now()
    };

    // Track usage
    if (sticker.packId) {
      await this.trackStickerUsage(userId, sticker.id, sticker.packId);
    }

    // Send via chatService
    return await chatService.sendMessage(chatId, messageData, userId);
  }
}

export const stickersService = new StickersService();
export default stickersService;
