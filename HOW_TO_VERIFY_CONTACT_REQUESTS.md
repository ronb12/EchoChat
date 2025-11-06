# How to Verify Contact Requests in Firestore

## 🔍 Manual Verification Steps

### Step 1: Send a Contact Request

1. **Log in** as `ronellbradley@bradleyvs.com`
2. **Open browser console** (F12)
3. **Click "New Chat"** or press `Cmd+K` (Mac) / `Ctrl+K` (Windows)
4. **Search for** `ronellbradley@gmail.com`
5. **Click "📤 Send Contact Request"**

### Step 2: Check Console Logs

Look for these logs in the browser console:

```
📤 Creating contact request: {
  requestId: "SXbgJ3KDUoaBsCFjasNw5RM0Sax1_AJeObWk5kOSX2ILcKKqOr9P0OaG2",
  fromUserId: "SXbgJ3KDUoaBsCFjasNw5RM0Sax1",
  toUserId: "AJeObWk5kOSX2ILcKKqOr9P0OaG2",
  ...
}

✅ setDoc() completed successfully

✅ Contact request created and verified in Firestore: {
  requestId: "...",
  documentPath: "contactRequests/SXbgJ3KDUoaBsCFjasNw5RM0Sax1_AJeObWk5kOSX2ILcKKqOr9P0OaG2",
  savedFromUserId: "...",
  savedToUserId: "...",
  savedStatus: "pending",
  ...
}

✅ Document is queryable (can be found by receiver)
```

### Step 3: Check Firebase Console

1. Go to: https://console.firebase.google.com/project/echochat-messaging/firestore
2. Navigate to: **Firestore Database** → **Data** tab
3. Look for collection: **`contactRequests`**
4. Find document with ID: **`{fromUserId}_{toUserId}`**

   Example: `SXbgJ3KDUoaBsCFjasNw5RM0Sax1_AJeObWk5kOSX2ILcKKqOr9P0OaG2`

5. **Document should contain:**
   ```json
   {
     "fromUserId": "SXbgJ3KDUoaBsCFjasNw5RM0Sax1",
     "toUserId": "AJeObWk5kOSX2ILcKKqOr9P0OaG2",
     "status": "pending",
     "createdAt": 1234567890,
     "updatedAt": 1234567890
   }
   ```

### Step 4: Verify Receiver Can See It

1. **Log out** and **log in** as `ronellbradley@gmail.com`
2. **Open browser console** (F12)
3. **Click "Requests" button** in header
4. **Check console logs** for:

```
🔍 getPendingRequests called for userId: AJeObWk5kOSX2ILcKKqOr9P0OaG2
📡 Querying Firestore for ALL requests (toUserId only)...
📊 All requests found (any status): 1
📄 Request document: {
  id: "SXbgJ3KDUoaBsCFjasNw5RM0Sax1_AJeObWk5kOSX2ILcKKqOr9P0OaG2",
  fromUserId: "SXbgJ3KDUoaBsCFjasNw5RM0Sax1",
  toUserId: "AJeObWk5kOSX2ILcKKqOr9P0OaG2",
  status: "pending",
  ...
}
```

---

## 🐛 Troubleshooting

### If Document is NOT Created:

**Check console for errors:**
- `❌ Error calling setDoc()` - Firestore rules issue
- `❌ Contact request was NOT saved to Firestore!` - Save failed

**Possible causes:**
1. **Firestore Rules** - Check `firestore.rules` allows creating contact requests
2. **Network Error** - Check browser network tab for failed requests
3. **Authentication** - Ensure user is logged in

### If Document EXISTS but NOT Found by Receiver:

**Check console for:**
- `⚠️ Document exists but not found in query` - Query/index issue

**Possible causes:**
1. **Firestore Index** - May need composite index for `toUserId + status`
2. **Firestore Rules** - Query rules may be blocking
3. **userId Mismatch** - `toUserId` in document doesn't match receiver's `userId`

### If Query Returns 0 Results:

**Check:**
1. **userId Match**: Compare `toUserId` in document with receiver's `user.uid`
2. **Status Match**: Ensure status is exactly `"pending"` (case-sensitive)
3. **Firestore Rules**: Check `allow list` rule for `contactRequests` collection

---

## 📋 Expected Document Structure

**Collection:** `contactRequests`

**Document ID:** `{fromUserId}_{toUserId}`

**Document Data:**
```json
{
  "fromUserId": "string (28 chars)",
  "toUserId": "string (28 chars)",
  "status": "pending",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

---

## ✅ Success Indicators

1. ✅ Console shows "✅ setDoc() completed successfully"
2. ✅ Console shows "✅ Contact request created and verified in Firestore"
3. ✅ Console shows "✅ Document is queryable"
4. ✅ Document appears in Firebase Console
5. ✅ Receiver can see request in "Requests" modal
6. ✅ Query returns the document

---

## 🔧 Quick Check Script

Run this in browser console after sending a request:

```javascript
// Replace with actual user IDs
const fromUserId = 'SXbgJ3KDUoaBsCFjasNw5RM0Sax1';
const toUserId = 'AJeObWk5kOSX2ILcKKqOr9P0OaG2';
const requestId = `${fromUserId}_${toUserId}`;

// Check if document exists
import { db } from './src/services/firebaseConfig.js';
import { doc, getDoc } from 'firebase/firestore';

const requestRef = doc(db, 'contactRequests', requestId);
const docSnap = await getDoc(requestRef);

if (docSnap.exists()) {
  console.log('✅ Document exists:', docSnap.data());
} else {
  console.error('❌ Document NOT found!');
}
```

