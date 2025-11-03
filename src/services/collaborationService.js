// Collaboration Service for Team Collaboration
import { db } from './firebaseConfig';
import { collection, doc, addDoc, getDoc, setDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

class CollaborationService {
  constructor() {
    this.db = db;
  }

  // Create workspace/team
  async createWorkspace(userId, workspaceData) {
    try {
      const workspace = {
        name: workspaceData.name,
        description: workspaceData.description || '',
        ownerId: userId,
        members: [userId],
        admins: [userId],
        channels: [],
        createdAt: new Date(),
        settings: {
          allowGuestAccess: false,
          requireApproval: false,
          defaultChannel: null
        }
      };
      
      const workspaceRef = await addDoc(collection(this.db, 'workspaces'), workspace);
      return { id: workspaceRef.id, ...workspace };
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }

  // Create channel in workspace
  async createChannel(workspaceId, channelData) {
    try {
      const channel = {
        workspaceId,
        name: channelData.name,
        description: channelData.description || '',
        type: channelData.type || 'public', // public, private, direct
        members: channelData.members || [],
        createdAt: new Date(),
        pinned: false
      };
      
      const channelRef = await addDoc(collection(this.db, 'channels'), channel);
      
      // Update workspace channels list
      const workspaceRef = doc(this.db, 'workspaces', workspaceId);
      const workspaceDoc = await getDoc(workspaceRef);
      if (workspaceDoc.exists()) {
        const channels = workspaceDoc.data().channels || [];
        channels.push(channelRef.id);
        await updateDoc(workspaceRef, { channels });
      }
      
      return { id: channelRef.id, ...channel };
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  // Send message with thread support
  async sendThreadedMessage(channelId, messageData, parentMessageId = null) {
    try {
      const message = {
        channelId,
        text: messageData.text,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        parentMessageId,
        threadCount: 0,
        timestamp: new Date(),
        ...messageData
      };
      
      const messageRef = await addDoc(collection(this.db, 'messages'), message);
      
      // Update thread count if replying
      if (parentMessageId) {
        const parentRef = doc(this.db, 'messages', parentMessageId);
        const parentDoc = await getDoc(parentRef);
        if (parentDoc.exists()) {
          const threadCount = (parentDoc.data().threadCount || 0) + 1;
          await updateDoc(parentRef, { threadCount });
        }
      }
      
      return { id: messageRef.id, ...message };
    } catch (error) {
      console.error('Error sending threaded message:', error);
      throw error;
    }
  }

  // Get thread replies
  async getThreadReplies(parentMessageId) {
    try {
      const q = query(
        collection(this.db, 'messages'),
        where('parentMessageId', '==', parentMessageId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting thread replies:', error);
      throw error;
    }
  }

  // Add mention to message
  async addMention(messageId, userId) {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const mentions = messageDoc.data().mentions || [];
        if (!mentions.includes(userId)) {
          mentions.push(userId);
          await updateDoc(messageRef, { mentions });
        }
      }
    } catch (error) {
      console.error('Error adding mention:', error);
      throw error;
    }
  }

  // Get user workspaces
  async getUserWorkspaces(userId) {
    try {
      const q = query(
        collection(this.db, 'workspaces'),
        where('members', 'array-contains', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user workspaces:', error);
      throw error;
    }
  }

  // Add member to workspace
  async addWorkspaceMember(workspaceId, userId, role = 'member') {
    try {
      const workspaceRef = doc(this.db, 'workspaces', workspaceId);
      const workspaceDoc = await getDoc(workspaceRef);
      if (workspaceDoc.exists()) {
        const members = workspaceDoc.data().members || [];
        const admins = workspaceDoc.data().admins || [];
        
        if (!members.includes(userId)) {
          members.push(userId);
          if (role === 'admin') {
            admins.push(userId);
          }
          await updateDoc(workspaceRef, { members, admins });
        }
      }
    } catch (error) {
      console.error('Error adding workspace member:', error);
      throw error;
    }
  }

  // Create task (task management integration)
  async createTask(workspaceId, taskData) {
    try {
      const task = {
        workspaceId,
        title: taskData.title,
        description: taskData.description || '',
        assignedTo: taskData.assignedTo || [],
        createdBy: taskData.createdBy,
        status: 'todo', // todo, in-progress, done
        priority: taskData.priority || 'medium', // low, medium, high
        dueDate: taskData.dueDate || null,
        createdAt: new Date()
      };
      
      const taskRef = await addDoc(collection(this.db, 'tasks'), task);
      return { id: taskRef.id, ...task };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;

