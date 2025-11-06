# Contact Request Troubleshooting Guide

## Issue: No Pending Contact Request Showing

When sending a contact request from `ronellbradley@bradleyvs.com` to `ronellbradley@gmail.com`, the receiver doesn't see it.

## Diagnostic Steps

### Step 1: Check Browser Console Logs

**When SENDING the request (as ronellbradley@bradleyvs.com):**

Look for these logs in the console:
```
📤 Creating contact request: {
  requestId: "...",
  fromUserId: "...",
  toUserId: "...",
  ...
}

✅ setDoc() completed successfully

✅ Contact request created and verified in Firestore: {
  requestId: "...",
  documentPath: "contactRequests/...",
  savedFromUserId: "...",
  savedToUserId: "...",
  savedStatus: "pending",
  ...
}

✅ Document is queryable (can be found by receiver)
```

**If you see errors:**
- `❌ Error calling setDoc()` - Firestore rules issue
- `❌ Contact request was NOT saved to Firestore!` - Save failed
- `⚠️ Document exists but not found in query` - Index or query issue

### Step 2: Check Receiver's Console (as ronellbradley@gmail.com)

**When checking for pending requests:**

Look for these logs:
```
🔍 getPendingRequests called for userId: ...
📡 Querying Firestore for ALL requests (toUserId only)...
📊 All requests found (any status): X
📡 Querying Firestore for pending requests (with status filter)...
📊 Query result (pending only): X documents found
```

**If query returns 0:**
- Check if `userId` matches the `toUserId` in the document
- Check if status is exactly `"pending"` (case-sensitive)
- Check if index is built (may take a few minutes)

### Step 3: Run Diagnostic Script

1. **Open browser console** (F12)
2. **Log in as ronellbradley@gmail.com** (the receiver)
3. **Copy and paste** the script from `scripts/diagnose-contact-request.js`
4. **Run it** - it will check:
   - Current user's userId
   - All contactRequests documents
   - Specific request document
   - Query results

### Step 4: Check Firebase Console

1. Go to: https://console.firebase.google.com/project/echochat-messaging/firestore
2. Navigate to: **Firestore Database** → **Data** tab
3. Look for collection: **`contactRequests`**
4. Find document with ID: **`{fromUserId}_{toUserId}`**

   Example: `SXbgJ3KDUoaBsCFjasNw5RM0Sax1_AJeObWk5kOSX2ILcKKqOr9P0OaG2`

5. **Check document fields:**
   - `fromUserId` should match sender's `user.uid`
   - `toUserId` should match receiver's `user.uid`
   - `status` should be `"pending"`

### Step 5: Verify User IDs Match

**Common Issue:** The `toUserId` in the document doesn't match the receiver's `user.uid`.

**To check:**
1. Log in as **ronellbradley@gmail.com**
2. Open console and run:
   ```javascript
   import { auth } from './src/services/firebaseConfig.js';
   console.log('Current user UID:', auth.currentUser.uid);
   ```
3. Compare this with the `toUserId` in the Firestore document

**If they don't match:**
- The request was sent to the wrong userId
- Check how `toUserId` is determined in `NewChatModal.jsx`

### Step 6: Check Index Status

1. Go to: https://console.firebase.google.com/project/echochat-messaging/firestore/indexes
2. Look for indexes:
   - `contactRequests: toUserId + status` - Should show "Enabled" (green checkmark)
   - `contactRequests: fromUserId + status` - Should show "Enabled" (green checkmark)

**If index is still building:**
- Wait a few minutes
- Index creation can take 2-5 minutes

**If index shows error:**
- Check the index configuration
- Redeploy: `firebase deploy --only firestore:indexes`

## Common Issues and Solutions

### Issue 1: Document Not Created

**Symptoms:**
- Console shows `❌ Contact request was NOT saved to Firestore!`
- No document in Firebase Console

**Solutions:**
1. Check Firestore rules allow creating contact requests
2. Check user is authenticated
3. Check network tab for failed requests

### Issue 2: Document Exists But Not Found by Query

**Symptoms:**
- Document exists in Firebase Console
- Query returns 0 results
- Console shows `⚠️ Document exists but not found in query`

**Solutions:**
1. **Check userId match:**
   - Verify `toUserId` in document matches receiver's `user.uid`
   - Check for typos or case sensitivity

2. **Check status match:**
   - Verify status is exactly `"pending"` (not `"Pending"` or `"PENDING"`)

3. **Check index:**
   - Verify index is built and enabled
   - Wait for index to finish building

### Issue 3: Query Error: "The query requires an index"

**Symptoms:**
- Console error: `failed-precondition`
- Error message mentions index

**Solutions:**
1. Click the link in the error to create the index automatically
2. Or deploy indexes: `firebase deploy --only firestore:indexes`
3. Wait for index to build (check Firebase Console)

### Issue 4: Wrong User ID Used

**Symptoms:**
- Request sent but `toUserId` doesn't match receiver's `user.uid`
- Document exists but receiver can't see it

**Solutions:**
1. Check how `toUserId` is determined in `NewChatModal.jsx`
2. Verify the searched user's `user.uid` is used (not email or displayName)
3. Check if user document exists in Firestore for the receiver

## Quick Fix Checklist

- [ ] Check browser console for errors when sending request
- [ ] Check browser console for errors when checking pending requests
- [ ] Verify document exists in Firebase Console
- [ ] Verify `toUserId` in document matches receiver's `user.uid`
- [ ] Verify `status` is exactly `"pending"`
- [ ] Check index status in Firebase Console
- [ ] Wait for index to finish building if still in progress
- [ ] Run diagnostic script in browser console
- [ ] Check Firestore rules are deployed
- [ ] Check Firestore indexes are deployed

## Still Not Working?

1. **Share console logs** from both sender and receiver
2. **Share Firestore document** screenshot/data
3. **Share index status** from Firebase Console
4. **Run diagnostic script** and share results

