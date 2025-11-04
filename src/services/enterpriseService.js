// Enterprise Service for Enterprise Deployment
import { db } from './firebaseConfig';
import { collection, doc, addDoc, getDoc, setDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

class EnterpriseService {
  constructor() {
    this.db = db;
  }

  // Create enterprise organization
  async createOrganization(adminId, orgData) {
    try {
      const org = {
        name: orgData.name,
        domain: orgData.domain,
        adminId,
        admins: [adminId],
        members: [],
        settings: {
          ssoEnabled: orgData.ssoEnabled || false,
          ssoProvider: orgData.ssoProvider || null, // google, okta, azure, custom
          ssoConfig: orgData.ssoConfig || {},
          requireSso: orgData.requireSso || false,
          dataRetentionDays: orgData.dataRetentionDays || 365,
          allowGuestAccess: orgData.allowGuestAccess || false,
          complianceMode: orgData.complianceMode || 'standard', // standard, gdpr, hipaa, soc2
          auditLogEnabled: orgData.auditLogEnabled !== false,
          messageEncryption: orgData.messageEncryption !== false
        },
        createdAt: new Date(),
        plan: orgData.plan || 'enterprise'
      };

      const orgRef = await addDoc(collection(this.db, 'organizations'), org);
      return { id: orgRef.id, ...org };
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  // SSO Authentication
  async authenticateSSO(orgId, ssoToken, provider) {
    try {
      const orgRef = doc(this.db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const org = orgDoc.data();

      if (!org.settings?.ssoEnabled) {
        throw new Error('SSO not enabled for this organization');
      }

      // In production, verify SSO token with provider
      // This is a stub - integrate with actual SSO provider
      const ssoConfig = org.settings.ssoConfig || {};

      // Mock verification (replace with actual SSO verification)
      const verified = true; // await verifyWithProvider(ssoToken, provider, ssoConfig);

      if (verified) {
        return {
          success: true,
          userId: null, // Get from SSO provider
          organizationId: orgId
        };
      }

      return { success: false, error: 'SSO authentication failed' };
    } catch (error) {
      console.error('Error authenticating SSO:', error);
      throw error;
    }
  }

  // Add audit log entry
  async addAuditLog(orgId, logEntry) {
    try {
      const auditLog = {
        organizationId: orgId,
        userId: logEntry.userId,
        action: logEntry.action, // message_sent, message_deleted, user_added, etc.
        resourceType: logEntry.resourceType, // message, user, channel, etc.
        resourceId: logEntry.resourceId,
        details: logEntry.details || {},
        ipAddress: logEntry.ipAddress || null,
        userAgent: logEntry.userAgent || null,
        timestamp: new Date()
      };

      const logRef = await addDoc(collection(this.db, 'auditLogs'), auditLog);
      return { id: logRef.id, ...auditLog };
    } catch (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
  }

  // Get audit logs
  async getAuditLogs(orgId, filters = {}) {
    try {
      let q = query(
        collection(this.db, 'auditLogs'),
        where('organizationId', '==', orgId)
      );

      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }

      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }

      if (filters.startDate) {
        q = query(q, where('timestamp', '>=', filters.startDate));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  // Admin: Manage users
  async addUserToOrganization(orgId, userId, role = 'member', addedBy) {
    try {
      const orgRef = doc(this.db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const org = orgDoc.data();
      const admins = org.admins || [];

      if (!admins.includes(addedBy)) {
        throw new Error('Only admins can add users');
      }

      const members = org.members || [];
      if (!members.find(m => m.userId === userId)) {
        members.push({
          userId,
          role,
          addedAt: new Date(),
          addedBy
        });

        await updateDoc(orgRef, { members });

        // Add audit log
        await this.addAuditLog(orgId, {
          userId: addedBy,
          action: 'user_added',
          resourceType: 'user',
          resourceId: userId,
          details: { role, addedUserId: userId }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding user to organization:', error);
      throw error;
    }
  }

  // Admin: Remove user
  async removeUserFromOrganization(orgId, userId, removedBy) {
    try {
      const orgRef = doc(this.db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const org = orgDoc.data();
      const admins = org.admins || [];

      if (!admins.includes(removedBy)) {
        throw new Error('Only admins can remove users');
      }

      const members = org.members || [];
      const updatedMembers = members.filter(m => m.userId !== userId);

      await updateDoc(orgRef, { members: updatedMembers });

      // Add audit log
      await this.addAuditLog(orgId, {
        userId: removedBy,
        action: 'user_removed',
        resourceType: 'user',
        resourceId: userId,
        details: { removedUserId: userId }
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing user from organization:', error);
      throw error;
    }
  }

  // Data retention policy enforcement
  async enforceDataRetention(orgId) {
    try {
      const orgRef = doc(this.db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const org = orgDoc.data();
      const retentionDays = org.settings?.dataRetentionDays || 365;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // In production, query and delete messages older than cutoff
      // This is a stub
      return {
        messagesDeleted: 0,
        cutoffDate: cutoffDate.toISOString()
      };
    } catch (error) {
      console.error('Error enforcing data retention:', error);
      throw error;
    }
  }

  // Get organization analytics
  async getOrganizationAnalytics(orgId, startDate, endDate) {
    try {
      // In production, query analytics data
      return {
        totalMessages: 0,
        activeUsers: 0,
        totalChannels: 0,
        storageUsed: 0,
        complianceScore: 100
      };
    } catch (error) {
      console.error('Error getting organization analytics:', error);
      throw error;
    }
  }

  // Compliance report
  async generateComplianceReport(orgId, reportType = 'gdpr') {
    try {
      const orgRef = doc(this.db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const org = orgDoc.data();

      return {
        organizationId: orgId,
        reportType,
        generatedAt: new Date(),
        complianceMode: org.settings?.complianceMode || 'standard',
        dataRetentionPolicy: org.settings?.dataRetentionDays || 365,
        auditLogEnabled: org.settings?.auditLogEnabled || false,
        messageEncryption: org.settings?.messageEncryption || false,
        totalUsers: org.members?.length || 0,
        totalMessages: 0, // Query from messages collection
        lastAuditDate: null // Query from audit logs
      };
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }
}

export const enterpriseService = new EnterpriseService();
export default enterpriseService;


