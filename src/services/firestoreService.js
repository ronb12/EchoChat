// Firebase Firestore Service - Production Backend
import { db, storage } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

class FirestoreService {
  constructor() {
    this.db = db;
    this.storage = storage;
    this.unsubscribes = new Map();
  }

  // Messages
  async sendMessage(chatId, messageData) {
    try {
      // Upload media files if present
      let imageUrl = messageData.image;
      let audioUrl = messageData.audio;
      let fileUrl = messageData.file;

      if (messageData.imageFile) {
        imageUrl = await this.uploadFile(chatId, messageData.imageFile, 'images');
      }
      if (messageData.audioFile) {
        audioUrl = await this.uploadFile(chatId, messageData.audioFile, 'audio');
      }
      if (messageData.fileData) {
        fileUrl = await this.uploadFile(chatId, messageData.fileData, 'files');
      }

      const message = {
        chatId,
        text: messageData.text || '',
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        timestamp: serverTimestamp(),
        deliveredAt: serverTimestamp(),
        readAt: null,
        reactions: {},
        edited: false,
        editedAt: null,
        deleted: false,
        deletedAt: null,
        deletedForEveryone: false,
        pinned: false,
        forwarded: false,
        image: imageUrl || null,
        audio: audioUrl || null,
        file: fileUrl || null,
        sticker: messageData.sticker || null,
        stickerId: messageData.stickerId || null,
        stickerPackId: messageData.stickerPackId || null,
        video: messageData.video || null,
        videoName: messageData.videoName || null,
        imageName: messageData.imageName || null,
        audioName: messageData.audioName || null,
        fileName: messageData.fileName || null,
        fileSize: messageData.fileSize || null,
        fileType: messageData.fileType || null
      };

      console.log('📤 Sending message to Firestore:', {
        chatId,
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text?.substring(0, 50) || '(no text)',
        hasImage: !!message.image,
        hasAudio: !!message.audio,
        hasFile: !!message.file
      });
      const docRef = await addDoc(collection(this.db, 'messages'), message);
      console.log('✅ Message sent successfully:', {
        messageId: docRef.id,
        chatId,
        senderId: message.senderId
      });
      // Return message with Firestore document ID, preserving all fields including sticker
      return {
        id: docRef.id,
        ...message,
        // Ensure sticker fields are preserved
        sticker: message.sticker || null,
        stickerId: message.stickerId || null,
        stickerPackId: message.stickerPackId || null
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  buildMessagePreview(messageData) {
    if (!messageData) {return '';} // Guard

    const text = typeof messageData.text === 'string' ? messageData.text.trim() : '';
    if (text) {
      return text.length > 120 ? `${text.slice(0, 117)}...` : text;
    }

    if (messageData.sticker || messageData.stickerId) {
      return '🗒️ Sticker';
    }

    if (messageData.image || messageData.imageFile) {
      return '📷 Photo';
    }

    if (messageData.video || messageData.videoName) {
      return '🎥 Video';
    }

    if (messageData.audio || messageData.audioName) {
      return '🎵 Audio';
    }

    if (messageData.file || messageData.fileName) {
      return messageData.fileName ? `📎 ${messageData.fileName}` : '📎 File';
    }

    return 'New message';
  }

  async updateChatAfterMessage(chatId, messageData) {
    try {
      const chatRef = doc(this.db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        return;
      }

      const chatData = chatSnap.data() || {};
      const participants = Array.isArray(chatData.participants) ? chatData.participants : [];
      const unreadCountMap = { ...(chatData.unreadCount || {}) };

      participants.forEach((participantId) => {
        if (!participantId) {return;}
        if (participantId === messageData.senderId) {
          unreadCountMap[participantId] = 0;
        } else {
          const currentCount = typeof unreadCountMap[participantId] === 'number'
            ? unreadCountMap[participantId]
            : 0;
          unreadCountMap[participantId] = currentCount + 1;
        }
      });

      const updatePayload = {
        lastMessageAt: serverTimestamp(),
        lastMessage: this.buildMessagePreview(messageData),
        lastMessageSenderId: messageData.senderId || null,
        lastMessageSenderName: messageData.senderName || null,
        unreadCount: unreadCountMap,
        updatedAt: serverTimestamp()
      };

      await updateDoc(chatRef, updatePayload);
    } catch (error) {
      console.error('Error updating chat metadata after message:', error);
    }
  }

  subscribeToMessages(chatId, callback) {
    console.log('📬 subscribeToMessages called for chatId:', chatId);
    const q = query(
      collection(this.db, 'messages'),
      where('chatId', '==', chatId),
      where('deletedForEveryone', '==', false),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📬 Real-time message update for chatId: ${chatId}, messages count: ${snapshot.size}`);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Preserve timestamp conversions
          timestamp: data.timestamp?.toMillis() || Date.now(),
          deliveredAt: data.deliveredAt?.toMillis() || null,
          readAt: data.readAt?.toMillis() || null,
          editedAt: data.editedAt?.toMillis() || null,
          deletedAt: data.deletedAt?.toMillis() || null,
          // Explicitly preserve sticker fields from Firestore
          sticker: data.sticker || null,
          stickerId: data.stickerId || null,
          stickerPackId: data.stickerPackId || null,
          // Preserve video fields
          video: data.video || null,
          videoName: data.videoName || null
        };
      });
      console.log(`📬 Calling callback with ${messages.length} messages for chatId: ${chatId}`);
      callback(messages);
    }, (error) => {
      console.error('Error subscribing to messages:', error);
    });

    this.unsubscribes.set(`messages_${chatId}`, unsubscribe);
    return () => {
      unsubscribe();
      this.unsubscribes.delete(`messages_${chatId}`);
    };
  }

  async editMessage(messageId, newText) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      await updateDoc(messageRef, {
        text: newText,
        edited: true,
        editedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId, forEveryone = false) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      if (forEveryone) {
        await updateDoc(messageRef, {
          deleted: true,
          deletedForEveryone: true,
          deletedAt: serverTimestamp(),
          text: 'This message was deleted'
        });
      } else {
        await updateDoc(messageRef, {
          deleted: true,
          deletedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async addReaction(messageId, emoji, userId) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const data = messageDoc.data();
        const reactions = data.reactions || {};
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        if (!reactions[emoji].includes(userId)) {
          reactions[emoji].push(userId);
        }
        await updateDoc(messageRef, { reactions });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  async removeReaction(messageId, emoji, userId) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const data = messageDoc.data();
        const reactions = data.reactions || {};
        if (reactions[emoji]) {
          reactions[emoji] = reactions[emoji].filter(id => id !== userId);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
          await updateDoc(messageRef, { reactions });
        }
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  async markMessageAsRead(chatId, messageId, userId) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const data = messageDoc.data();
        if (data.chatId === chatId && data.senderId !== userId && !data.readAt) {
          await updateDoc(messageRef, {
            readAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async pinMessage(messageId, userId) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      await updateDoc(messageRef, {
        pinned: true,
        pinnedAt: serverTimestamp(),
        pinnedBy: userId
      });
    } catch (error) {
      console.error('Error pinning message:', error);
      throw error;
    }
  }

  async unpinMessage(messageId) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      await updateDoc(messageRef, {
        pinned: false,
        pinnedAt: null,
        pinnedBy: null
      });
    } catch (error) {
      console.error('Error unpinning message:', error);
      throw error;
    }
  }

  // File upload to Firebase Storage
  async uploadFile(chatId, file, folder = 'files') {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(this.storage, `chats/${chatId}/${folder}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Chats
  async createChat(participants, chatName, isGroup = false) {
    try {
      const chatData = {
        name: chatName || (isGroup ? 'Group Chat' : 'Direct Chat'),
        participants,
        type: isGroup ? 'group' : 'direct',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessage: null,
        unreadCount: {}
      };

      const docRef = await addDoc(collection(this.db, 'chats'), chatData);
      return { id: docRef.id, ...chatData };
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  async deleteChat(chatId) {
    try {
      if (!chatId) {return;}

      const chatRef = doc(this.db, 'chats', chatId);
      const messagesRef = collection(this.db, 'messages');
      const batchSize = 100;

      // Delete messages in batches
      while (true) {
        const messageSnapshot = await getDocs(query(messagesRef, where('chatId', '==', chatId), limit(batchSize)));
        if (messageSnapshot.empty) {
          break;
        }
        const batch = writeBatch(this.db);
        messageSnapshot.forEach((messageDoc) => {
          batch.delete(messageDoc.ref);
        });
        await batch.commit();
        if (messageSnapshot.size < batchSize) {
          break;
        }
      }

      // Delete typing indicators if any
      const typingCollection = collection(this.db, 'chats', chatId, 'typing');
      const typingSnapshot = await getDocs(typingCollection);
      if (!typingSnapshot.empty) {
        const batch = writeBatch(this.db);
        typingSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }

      await deleteDoc(chatRef);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  subscribeToUserChats(userId, callback) {
    // Try with orderBy first (requires index)
    const q = query(
      collection(this.db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        lastMessageAt: doc.data().lastMessageAt?.toMillis() || Date.now()
      }));
      callback(chats);
    }, (error) => {
      // If index error, try query without orderBy and sort client-side
      if (error.code === 'failed-precondition' && (error.message.includes('index') || error.message.includes('requires an index'))) {
        console.warn('Firestore index not ready, using client-side sorting:', error.message);
        const qWithoutOrder = query(
          collection(this.db, 'chats'),
          where('participants', 'array-contains', userId)
        );

        const unsubscribeFallback = onSnapshot(qWithoutOrder, (snapshot) => {
          let chats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toMillis() || Date.now(),
            lastMessageAt: doc.data().lastMessageAt?.toMillis() || Date.now()
          }));
          // Sort client-side by lastMessageAt
          chats = chats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
          callback(chats);
        }, (fallbackError) => {
          console.error('Error subscribing to chats (fallback):', fallbackError);
        });

        this.unsubscribes.set(`chats_${userId}`, unsubscribeFallback);
        return () => {
          unsubscribeFallback();
          this.unsubscribes.delete(`chats_${userId}`);
        };
      } else {
        console.error('Error subscribing to chats:', error);
      }
    });

    this.unsubscribes.set(`chats_${userId}`, unsubscribe);
    return () => {
      unsubscribe();
      this.unsubscribes.delete(`chats_${userId}`);
    };
  }

  // Users
  async getUsers(searchQuery = '') {
    try {
      const usersRef = collection(this.db, 'users');
      const snapshot = await getDocs(usersRef);
      let users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        users = users.filter(user =>
          user.displayName?.toLowerCase().includes(queryLower) ||
          user.email?.toLowerCase().includes(queryLower)
        );
      }

      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  // Block/Report users
  async blockUser(userId, blockedUserId) {
    try {
      const blockRef = doc(this.db, 'blocked', `${userId}_${blockedUserId}`);
      await addDoc(collection(this.db, 'blocked'), {
        userId,
        blockedUserId,
        blockedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  async reportUser(userId, reportedUserId, reason) {
    try {
      await addDoc(collection(this.db, 'reports'), {
        reporterId: userId,
        reportedUserId,
        reason,
        reportedAt: serverTimestamp(),
        status: 'pending'
      });
    } catch (error) {
      console.error('Error reporting user:', error);
      throw error;
    }
  }

  async getBlockedUsers(userId) {
    try {
      const q = query(
        collection(this.db, 'blocked'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data().blockedUserId);
    } catch (error) {
      console.error('Error getting blocked users:', error);
      throw error;
    }
  }

  // Typing indicators
  subscribeToTypingIndicators(chatId, callback) {
    const typingRef = collection(this.db, 'chats', chatId, 'typing');
    const handleSnapshot = (snapshot) => {
      const typingUsers = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp?.toMillis() > Date.now() - 3000) {
          typingUsers[data.userId] = {
            userId: data.userId,
            displayName: data.displayName,
            ts: data.timestamp.toMillis()
          };
        }
      });
      callback(typingUsers);
    };
    const unsubscribe = onSnapshot(typingRef, handleSnapshot);

    this.unsubscribes.set(`typing_${chatId}`, unsubscribe);
    return () => {
      unsubscribe();
      this.unsubscribes.delete(`typing_${chatId}`);
    };
  }

  async sendTypingIndicator(chatId, userId, displayName) {
    try {
      const typingRef = doc(this.db, 'chats', chatId, 'typing', userId);
      await updateDoc(typingRef, {
        userId,
        displayName,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      // Create if doesn't exist
      try {
        await addDoc(collection(this.db, 'chats', chatId, 'typing'), {
          userId,
          displayName,
          timestamp: serverTimestamp()
        });
      } catch (createError) {
        console.error('Error sending typing indicator:', createError);
      }
    }
  }

  // Presence
  async setUserPresence(userId, status) {
    try {
      const presenceRef = doc(this.db, 'users', userId);
      await updateDoc(presenceRef, {
        presence: status,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error setting presence:', error);
    }
  }

  subscribeToPresence(callback) {
    const usersRef = collection(this.db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const presence = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        presence[doc.id] = {
          status: data.presence || 'offline',
          lastSeen: data.lastSeen?.toMillis() || null
        };
      });
      callback(presence);
    });

    this.unsubscribes.set('presence', unsubscribe);
    return () => {
      unsubscribe();
      this.unsubscribes.delete('presence');
    };
  }

  // Cleanup
  cleanup() {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes.clear();
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;


