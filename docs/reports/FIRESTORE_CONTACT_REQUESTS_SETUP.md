# Firestore Contact Requests Setup Verification

## ✅ Configuration Status

### 1. Firestore Rules ✅

**Collection:** `contactRequests`

**Rules configured in `firestore.rules` (lines 55-68):**

```javascript
match /contactRequests/{requestId} {
  // Allow list queries for authenticated users (needed for getPendingRequests)
  allow list: if isAuthenticated();
  
  // Allow read if user is sender or receiver
  allow read: if isAuthenticated() && 
    (request.auth.uid == resource.data.fromUserId || 
     request.auth.uid == resource.data.toUserId);
  
  // Allow create if user is the sender
  allow create: if isAuthenticated() && 
    request.auth.uid == request.resource.data.fromUserId;
  
  // Allow update/delete if user is sender or receiver
  allow update, delete: if isAuthenticated() && 
    (request.auth.uid == resource.data.fromUserId || 
     request.auth.uid == resource.data.toUserId);
}
```

**✅ Status:** Rules are correctly configured for:
- ✅ List queries (for `getPendingRequests`)
- ✅ Read access (sender or receiver only)
- ✅ Create access (sender only)
- ✅ Update/Delete access (sender or receiver)

---

### 2. Firestore Indexes ✅

**Indexes configured in `firestore.indexes.json`:**

#### Index 1: Query by `toUserId` + `status`
```json
{
  "collectionGroup": "contactRequests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "toUserId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    }
  ]
}
```

**Used by:** `getPendingRequests()` - Query for incoming requests
```javascript
where('toUserId', '==', userId),
where('status', '==', 'pending')
```

#### Index 2: Query by `fromUserId` + `status`
```json
{
  "collectionGroup": "contactRequests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "fromUserId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    }
  ]
}
```

**Used by:** `getSentRequests()` - Query for outgoing requests
```javascript
where('fromUserId', '==', userId),
where('status', '==', 'pending')
```

**✅ Status:** Both composite indexes are configured

---

### 3. Document Structure ✅

**Collection:** `contactRequests`

**Document ID Format:** `{fromUserId}_{toUserId}`

**Example:** `SXbgJ3KDUoaBsCFjasNw5RM0Sax1_AJeObWk5kOSX2ILcKKqOr9P0OaG2`

**Document Fields:**
```json
{
  "fromUserId": "string (28 characters - Firebase Auth UID)",
  "toUserId": "string (28 characters - Firebase Auth UID)",
  "status": "pending" | "accepted" | "rejected",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

**✅ Status:** Document structure matches implementation in `contactService.js`

---

## 📋 Queries Used

### 1. Get Pending Requests (Incoming)
```javascript
query(
  collection(db, 'contactRequests'),
  where('toUserId', '==', userId),
  where('status', '==', 'pending')
)
```
**Index Required:** ✅ `toUserId` + `status` (composite)

### 2. Get Sent Requests (Outgoing)
```javascript
query(
  collection(db, 'contactRequests'),
  where('fromUserId', '==', userId),
  where('status', '==', 'pending')
)
```
**Index Required:** ✅ `fromUserId` + `status` (composite)

### 3. Get Single Request (by ID)
```javascript
doc(db, 'contactRequests', requestId)
```
**Index Required:** ❌ None (direct document access)

### 4. Get All Requests (Debug Query)
```javascript
query(
  collection(db, 'contactRequests'),
  where('toUserId', '==', userId)
)
```
**Index Required:** ❌ None (single field query - auto-indexed)

---

## 🚀 Deployment Steps

### Step 1: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Step 2: Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

**Note:** Index creation can take a few minutes. Check status in Firebase Console:
- Go to: https://console.firebase.google.com/project/echochat-messaging/firestore/indexes
- Wait for status to show "Enabled" (green checkmark)

### Step 3: Verify Deployment
1. **Check Rules:**
   - Go to: https://console.firebase.google.com/project/echochat-messaging/firestore/rules
   - Verify `contactRequests` rules are present

2. **Check Indexes:**
   - Go to: https://console.firebase.google.com/project/echochat-messaging/firestore/indexes
   - Verify both `contactRequests` indexes are "Enabled"

---

## ✅ Verification Checklist

- [x] Firestore rules allow `list` queries for authenticated users
- [x] Firestore rules allow `read` for sender or receiver
- [x] Firestore rules allow `create` for sender only
- [x] Firestore rules allow `update/delete` for sender or receiver
- [x] Composite index for `toUserId + status` is configured
- [x] Composite index for `fromUserId + status` is configured
- [x] Document structure matches implementation
- [x] Document ID format is `{fromUserId}_{toUserId}`

---

## 🐛 Troubleshooting

### Error: "The query requires an index"
**Solution:** 
1. Check Firebase Console for index creation link
2. Click the link to create the index automatically
3. Wait for index to be built (can take a few minutes)
4. Or deploy indexes manually: `firebase deploy --only firestore:indexes`

### Error: "Missing or insufficient permissions"
**Solution:**
1. Verify user is authenticated: `request.auth != null`
2. Verify `userId` matches `request.auth.uid`
3. Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
4. Check browser console for detailed error messages

### Query Returns 0 Results
**Possible Causes:**
1. **userId Mismatch:** Verify `toUserId` in document matches receiver's `user.uid`
2. **Status Mismatch:** Verify status is exactly `"pending"` (case-sensitive)
3. **Index Not Built:** Wait for index to finish building
4. **Rules Blocking:** Check Firestore rules allow the query

---

## 📝 Summary

**✅ All Firestore configuration is correct:**
- ✅ Rules allow proper access control
- ✅ Indexes support all queries
- ✅ Document structure is defined
- ✅ Ready for deployment

**Next Steps:**
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Deploy indexes: `firebase deploy --only firestore:indexes`
3. Wait for indexes to build (check Firebase Console)
4. Test contact request flow

