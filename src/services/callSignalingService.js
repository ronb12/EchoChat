import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';

class CallSignalingService {
  constructor() {
    this.incomingListeners = new Map();
  }

  async createOffer(callId, payload) {
    if (!callId) {throw new Error('callId is required to create offer');}
    const callRef = doc(db, 'callSessions', callId);
    await setDoc(callRef, {
      ...payload,
      status: 'offer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return callRef;
  }

  async setAnswer(callId, answerPayload) {
    if (!callId) {throw new Error('callId is required to set answer');}
    const callRef = doc(db, 'callSessions', callId);
    await updateDoc(callRef, {
      answer: answerPayload,
      status: 'answer',
      updatedAt: serverTimestamp()
    });
  }

  async addIceCandidate(callId, candidate, sender) {
    if (!callId || !candidate) {return;}
    const candidatesRef = collection(db, 'callSessions', callId, 'candidates');
    await addDoc(candidatesRef, {
      sender,
      candidate,
      createdAt: serverTimestamp()
    });
  }

  listenToCall(callId, callback) {
    if (!callId) {return () => {};}
    const callRef = doc(db, 'callSessions', callId);
    return onSnapshot(callRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
      } else {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    }, (error) => {
      console.error('Call signaling listener error:', error);
    });
  }

  listenForCandidates(callId, localSender, callback) {
    if (!callId) {return () => {};}
    const candidatesRef = collection(db, 'callSessions', callId, 'candidates');
    return onSnapshot(candidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.sender !== localSender && data.candidate) {
            callback(data.candidate);
          }
        }
      });
    }, (error) => {
      console.error('Candidate listener error:', error);
    });
  }

  async markCallEnded(callId) {
    if (!callId) {return;}
    const callRef = doc(db, 'callSessions', callId);
    try {
      await updateDoc(callRef, {
        status: 'ended',
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('Unable to mark call ended:', error.message);
    }
  }

  async clearCall(callId) {
    if (!callId) {return;}
    const callRef = doc(db, 'callSessions', callId);
    try {
      const candidatesRef = collection(callRef, 'candidates');
      const snapshot = await getDocs(candidatesRef);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach((candidateDoc) => batch.delete(candidateDoc.ref));
        await batch.commit();
      }
      await deleteDoc(callRef);
    } catch (error) {
      console.warn('Unable to clear call session:', error.message);
    }
  }

  async updateCallSession(callId, data = {}) {
    if (!callId || !data) {return;}
    const callRef = doc(db, 'callSessions', callId);
    try {
      await updateDoc(callRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('Unable to update call session:', error.message);
    }
  }

  listenForIncomingCalls(userId, callback) {
    if (!userId) {return () => {};}
    const listenersKey = userId;
    if (this.incomingListeners.has(listenersKey)) {
      const prev = this.incomingListeners.get(listenersKey);
      prev();
    }

    const callsRef = collection(db, 'callSessions');
    const callQuery = query(callsRef,
      where('receiverId', '==', userId),
      where('status', '==', 'offer')
    );

    const unsubscribe = onSnapshot(callQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = { id: change.doc.id, ...change.doc.data() };
          callback(data);
        }
      });
    }, (error) => {
      console.error('Incoming call listener error:', error);
    });

    this.incomingListeners.set(listenersKey, unsubscribe);
    return () => {
      const stored = this.incomingListeners.get(listenersKey);
      if (stored) {
        stored();
        this.incomingListeners.delete(listenersKey);
      }
    };
  }
}

export const callSignalingService = new CallSignalingService();
export default callSignalingService;


