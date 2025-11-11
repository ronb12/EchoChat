# Firebase Setup Guide for EchoChat

## Overview
This guide helps you set up Firebase Firestore, Storage, and Security Rules for EchoChat.

## Required Collections Structure

### Collections Needed:
1. **profiles** - User profiles, aliases, status
2. **contacts** - User contact lists
3. **chats** - Chat conversations
4. **messages** - Chat messages
5. **groups** - Group chat information
6. **notifications** - User notifications
7. **settings** - User settings
8. **blocked** - Blocked users
9. **reports** - User reports
10. **payments** - Payment transactions (Stripe)
11. **stripe_accounts** - Stripe Connect account info

## Deploy Firebase Rules & Indexes

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase in your project (if not already done)
```bash
firebase init
```
Select:
- Firestore
- Storage
- Hosting (optional)

### 4. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 5. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### 6. Deploy Storage Rules
```bash
firebase deploy --only storage
```

## Security Rules Overview

### Firestore Rules (`firestore.rules`)
- **profiles**: Read allowed for authenticated users, write only by owner
- **chats**: Read/write only by participants
- **messages**: Read/write only by chat participants
- **payments**: Read by sender/recipient, create by sender only
- All other collections follow owner-based access

### Storage Rules (`storage.rules`)
- Chat files: Read/write by chat participants
- User avatars: Read by all, write by owner
- Profile pictures: Read by all, write by owner
- Temp files: Read/write by owner only

## Indexes Deployed

The following indexes are configured in `firestore.indexes.json`:

1. **Messages**: `chatId + timestamp` (ascending)
2. **Messages**: `chatId + senderId + timestamp`
3. **Messages**: `chatId + image + timestamp`
4. **Messages**: `chatId + file + timestamp`
5. **Chats**: `participants (array contains) + lastMessageTime`
6. **Chats**: `participants (array contains) + createdAt`
7. **Users**: `isOnline + lastSeen`
8. **Notifications**: `userId + timestamp + read`
9. **Payments**: `senderId + timestamp`
10. **Payments**: `recipientId + timestamp`
11. **Payments**: `status + timestamp`

## Testing Rules

### Test Mode (Development)
For development, you can use test mode in Firebase Console:
1. Go to Firebase Console → Firestore Database
2. Click on "Rules" tab
3. Temporarily use test mode:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```
⚠️ **Never use test mode in production!**

## Troubleshooting

### "Missing or insufficient permissions" Error
1. Check that user is authenticated (`request.auth != null`)
2. Verify user ID matches resource owner
3. Check that user is in participants/members array for chats/groups
4. Ensure rules are deployed: `firebase deploy --only firestore:rules`

### Index Errors
If you see "index required" errors:
1. Deploy indexes: `firebase deploy --only firestore:indexes`
2. Wait for indexes to build (can take a few minutes)
3. Check Firebase Console → Firestore → Indexes for status

### Storage Errors
1. Verify storage rules are deployed
2. Check file path matches rule patterns
3. Ensure user authentication is valid

## Production Checklist
- [ ] Deploy all Firestore rules
- [ ] Deploy all Firestore indexes
- [ ] Deploy Storage rules
- [ ] Test rules with authenticated users
- [ ] Remove test mode rules
- [ ] Enable Firestore backup
- [ ] Set up monitoring/alerts
- [ ] Review and audit security rules regularly



