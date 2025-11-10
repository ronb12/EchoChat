import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const CALL_HISTORY_COLLECTION = 'callHistory';

export class CallHistoryService {
  constructor() {
    this.collectionRef = collection(db, CALL_HISTORY_COLLECTION);
  }

  async logCallStart({
    callId,
    chatId = null,
    callerId,
    receiverId,
    callerName = null,
    receiverName = null,
    callType = 'audio',
    startedAt = serverTimestamp()
  }) {
    if (!callId || !callerId || !receiverId) {
      return null;
    }

    try {
      const participants = [callerId, receiverId].filter(Boolean);
      return await addDoc(this.collectionRef, {
        callId,
        chatId,
        callerId,
        receiverId,
        callerName,
        receiverName,
        participants,
        callType,
        startedAt,
        endedAt: null,
        durationSeconds: null,
        status: 'in_progress'
      });
    } catch (error) {
      console.error('Failed to log call start:', error);
      return null;
    }
  }

  async logCallEnd({
    historyDocId,
    endedAt = serverTimestamp(),
    durationSeconds = null,
    status = 'completed'
  }) {
    if (!historyDocId) {
      return;
    }

    try {
      const docRef = doc(db, CALL_HISTORY_COLLECTION, historyDocId);
      await updateDoc(docRef, {
        endedAt,
        durationSeconds,
        status
      });
    } catch (error) {
      console.error('Failed to log call end:', error);
    }
  }
  subscribeToUserHistory(userId, callback, { limitCount = 50 } = {}) {
    if (!userId) {return () => {};}

    try {
      const historyQuery = query(
        this.collectionRef,
        where('participants', 'array-contains', userId),
        orderBy('startedAt', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(historyQuery, (snapshot) => {
        const entries = snapshot.docs.map((entryDoc) => ({
          id: entryDoc.id,
          ...entryDoc.data()
        }));
        callback(entries);
      }, (error) => {
        console.error('Failed to subscribe to call history:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error creating call history subscription:', error);
      callback([]);
      return () => {};
    }
  }
}

export const callHistoryService = new CallHistoryService();

