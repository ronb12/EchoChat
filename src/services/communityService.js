// Community Service for Community Groups
import { db } from './firebaseConfig';
import { collection, doc, addDoc, getDoc, setDoc, query, where, getDocs, updateDoc, orderBy, limit } from 'firebase/firestore';

class CommunityService {
  constructor() {
    this.db = db;
  }

  // Create public community group
  async createCommunityGroup(userId, groupData) {
    try {
      const group = {
        name: groupData.name,
        description: groupData.description || '',
        category: groupData.category || 'general',
        ownerId: userId,
        moderators: [userId],
        members: [userId],
        memberCount: 1,
        isPublic: groupData.isPublic !== false,
        rules: groupData.rules || [],
        guidelines: groupData.guidelines || '',
        avatar: groupData.avatar || null,
        coverPhoto: groupData.coverPhoto || null,
        createdAt: new Date(),
        settings: {
          approvalRequired: groupData.approvalRequired || false,
          allowInvites: true,
          maxMembers: groupData.maxMembers || null
        }
      };

      const groupRef = await addDoc(collection(this.db, 'communities'), group);
      return { id: groupRef.id, ...group };
    } catch (error) {
      console.error('Error creating community group:', error);
      throw error;
    }
  }

  // Discover public communities
  async discoverCommunities(category = null, limitCount = 20) {
    try {
      let q = query(
        collection(this.db, 'communities'),
        where('isPublic', '==', true),
        orderBy('memberCount', 'desc'),
        limit(limitCount)
      );

      if (category) {
        q = query(
          collection(this.db, 'communities'),
          where('isPublic', '==', true),
          where('category', '==', category),
          orderBy('memberCount', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error discovering communities:', error);
      throw error;
    }
  }

  // Join community
  async joinCommunity(communityId, userId) {
    try {
      const communityRef = doc(this.db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);

      if (!communityDoc.exists()) {
        throw new Error('Community not found');
      }

      const community = communityDoc.data();
      const members = community.members || [];

      if (members.includes(userId)) {
        return { alreadyMember: true };
      }

      // Check approval requirement
      if (community.settings?.approvalRequired) {
        // Add to pending members
        const pending = community.pendingMembers || [];
        pending.push(userId);
        await updateDoc(communityRef, { pendingMembers: pending });
        return { requiresApproval: true };
      }

      // Direct join
      members.push(userId);
      await updateDoc(communityRef, {
        members,
        memberCount: members.length
      });

      return { success: true };
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  }

  // Approve member join request
  async approveMember(communityId, userId, moderatorId) {
    try {
      const communityRef = doc(this.db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);

      if (!communityDoc.exists()) {
        throw new Error('Community not found');
      }

      const community = communityDoc.data();
      const moderators = community.moderators || [];

      if (!moderators.includes(moderatorId)) {
        throw new Error('Only moderators can approve members');
      }

      const pending = community.pendingMembers || [];
      const members = community.members || [];

      if (pending.includes(userId) && !members.includes(userId)) {
        members.push(userId);
        pending.splice(pending.indexOf(userId), 1);

        await updateDoc(communityRef, {
          members,
          pendingMembers: pending,
          memberCount: members.length
        });

        return { success: true };
      }

      return { alreadyMember: true };
    } catch (error) {
      console.error('Error approving member:', error);
      throw error;
    }
  }

  // Post announcement
  async postAnnouncement(communityId, announcementData, userId) {
    try {
      const communityRef = doc(this.db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);

      if (!communityDoc.exists()) {
        throw new Error('Community not found');
      }

      const community = communityDoc.data();
      const moderators = community.moderators || [];

      if (!moderators.includes(userId)) {
        throw new Error('Only moderators can post announcements');
      }

      const announcement = {
        communityId,
        title: announcementData.title,
        content: announcementData.content,
        postedBy: userId,
        pinned: true,
        createdAt: new Date(),
        expiresAt: announcementData.expiresAt || null
      };

      const announcementRef = await addDoc(collection(this.db, 'announcements'), announcement);
      return { id: announcementRef.id, ...announcement };
    } catch (error) {
      console.error('Error posting announcement:', error);
      throw error;
    }
  }

  // Get community announcements
  async getAnnouncements(communityId) {
    try {
      const q = query(
        collection(this.db, 'announcements'),
        where('communityId', '==', communityId),
        where('pinned', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting announcements:', error);
      throw error;
    }
  }

  // Add moderator
  async addModerator(communityId, userId, addedBy) {
    try {
      const communityRef = doc(this.db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);

      if (!communityDoc.exists()) {
        throw new Error('Community not found');
      }

      const community = communityDoc.data();

      // Only owner can add moderators
      if (community.ownerId !== addedBy) {
        throw new Error('Only owner can add moderators');
      }

      const moderators = community.moderators || [];
      if (!moderators.includes(userId)) {
        moderators.push(userId);
        await updateDoc(communityRef, { moderators });
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding moderator:', error);
      throw error;
    }
  }

  // Remove member
  async removeMember(communityId, userId, removedBy) {
    try {
      const communityRef = doc(this.db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);

      if (!communityDoc.exists()) {
        throw new Error('Community not found');
      }

      const community = communityDoc.data();
      const moderators = community.moderators || [];

      // Only moderators can remove members
      if (!moderators.includes(removedBy)) {
        throw new Error('Only moderators can remove members');
      }

      const members = community.members || [];
      if (members.includes(userId)) {
        members.splice(members.indexOf(userId), 1);
        await updateDoc(communityRef, {
          members,
          memberCount: members.length
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }
}

export const communityService = new CommunityService();
export default communityService;


