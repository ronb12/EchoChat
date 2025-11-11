# EchoChat API Architecture

## Current Setup: Firebase Functions

EchoChat API is **already built into your app**! Here's how it works:

```
┌─────────────────────────────────────┐
│   Firebase Hosting (Frontend)      │
│   https://echochat-messaging.web.app│
└──────────────┬──────────────────────┘
               │
               │ /api/stripe/create-account
               ↓
┌─────────────────────────────────────┐
│   Firebase Functions (Your API)     │
│   functions/index.js                │
│   - Handles all /api/* routes       │
│   - Processes Stripe calls          │
│   - Returns JSON responses          │
└──────────────┬──────────────────────┘
               │
               │ Stripe API calls
               ↓
┌─────────────────────────────────────┐
│   Stripe API                        │
│   (External service)                │
└──────────────────────────────────────┘
```

## How It Works

### 1. Frontend Makes API Call

```javascript
// In your React component
const response = await fetch('/api/stripe/create-account', {
  method: 'POST',
  body: JSON.stringify({ userId, email })
});
```

### 2. Firebase Rewrites URL

Your `firebase.json` has this rule:
```json
{
  "source": "/api/**",
  "function": "api"
}
```

This automatically routes `/api/*` to your Firebase Function.

### 3. Firebase Function Processes Request

Your `functions/index.js` handles it:
```javascript
app.post('/api/stripe/create-account', async (req, res) => {
  // Your custom logic here
  // Call Stripe API
  // Return response
});
```

### 4. Response Sent Back to Frontend

The function returns JSON, which your frontend receives.

## Adding More API Endpoints

You can add any API endpoint you want! Here's how:

### Example: Add a Custom Endpoint

```javascript
// In functions/index.js

/**
 * Your custom API endpoint
 * GET /api/users/:userId
 */
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user from Firestore
    const userDoc = await admin.firestore()
      .collection('profiles')
      .doc(userId)
      .get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: userDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Custom business logic endpoint
 * POST /api/analytics/track
 */
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Save to Firestore
    await admin.firestore()
      .collection('analytics')
      .add({
        event,
        data,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Example: Add Chat API

```javascript
/**
 * Send message via API
 * POST /api/chat/send
 */
app.post('/api/chat/send', async (req, res) => {
  try {
    const { chatId, message, userId } = req.body;
    
    // Save message to Firestore
    await admin.firestore()
      .collection('messages')
      .add({
        chatId,
        message,
        userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Architecture Options

### Option 1: Current Setup (Recommended) ✅

**Firebase Functions with Express**
- ✅ All API logic in `functions/index.js`
- ✅ Uses Express for routing
- ✅ Can add unlimited endpoints
- ✅ Secure (server-side, secret keys safe)
- ✅ Scales automatically

**Structure:**
```
functions/
  ├── index.js (all API endpoints here)
  └── package.json
```

### Option 2: Modular Functions

**Separate functions for each endpoint**
- ✅ Better organization for large apps
- ✅ Independent scaling per function
- ⚠️ More files to manage

**Structure:**
```
functions/
  ├── index.js (exports all functions)
  ├── stripe/
  │   ├── createAccount.js
  │   └── createPaymentIntent.js
  ├── users/
  │   └── getUser.js
  └── chat/
      └── sendMessage.js
```

### Option 3: Client-Side API (NOT Recommended for Stripe)

**API calls directly from frontend**
- ❌ **CAN'T use Stripe secret keys** (security risk)
- ❌ **CAN'T use Firebase Admin SDK** (security risk)
- ✅ Can call external APIs that don't need secrets
- ⚠️ Limited to public APIs

**When to use:**
- Public API calls (no secret keys)
- Weather data
- Public data
- **NOT for payments, auth, or database writes**

## How to Add Your Own API Endpoints

### Step 1: Edit `functions/index.js`

Add your endpoint:

```javascript
/**
 * Your custom endpoint
 * GET /api/my-custom-endpoint
 */
app.get('/api/my-custom-endpoint', async (req, res) => {
  try {
    // Your logic here
    const result = await doSomething();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});
```

### Step 2: Use Firestore/Firebase Services

```javascript
// Access Firestore
const db = admin.firestore();

// Read data
const doc = await db.collection('users').doc('userId').get();

// Write data
await db.collection('users').doc('userId').set({ name: 'John' });

// Query data
const snapshot = await db.collection('messages')
  .where('chatId', '==', 'chat123')
  .get();
```

### Step 3: Deploy

```bash
firebase deploy --only functions
```

That's it! Your new endpoint is live at:
`https://echochat-messaging.web.app/api/my-custom-endpoint`

## Complete Example: Custom API

Here's a full example of adding a custom API:

```javascript
// In functions/index.js

/**
 * Get user's chat history
 * GET /api/chat/history/:userId
 */
app.get('/api/chat/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    // Query Firestore
    const snapshot = await admin.firestore()
      .collection('messages')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * Create a new chat
 * POST /api/chat/create
 */
app.post('/api/chat/create', async (req, res) => {
  try {
    const { userId, participants, type = 'direct' } = req.body;
    
    if (!userId || !participants) {
      return res.status(400).json({
        error: 'userId and participants are required'
      });
    }
    
    // Create chat in Firestore
    const chatRef = await admin.firestore()
      .collection('chats')
      .add({
        userId,
        participants,
        type,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    res.json({
      success: true,
      chatId: chatRef.id
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({
      error: error.message
    });
  }
});
```

## API Best Practices

### 1. Error Handling

Always wrap in try/catch:

```javascript
app.get('/api/endpoint', async (req, res) => {
  try {
    // Your logic
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Input Validation

Validate inputs:

```javascript
app.post('/api/endpoint', async (req, res) => {
  const { userId, email } = req.body;
  
  if (!userId || !email) {
    return res.status(400).json({
      error: 'userId and email are required'
    });
  }
  
  // Continue...
});
```

### 3. Authentication

Use Firebase Auth tokens:

```javascript
const authHeader = req.headers.authorization;
if (!authHeader) {
  return res.status(401).json({ error: 'Unauthorized' });
}

const token = authHeader.split('Bearer ')[1];
const decodedToken = await admin.auth().verifyIdToken(token);
const userId = decodedToken.uid;
```

### 4. CORS

Already configured, but you can customize:

```javascript
app.use(cors({
  origin: ['https://echochat-messaging.web.app'],
  credentials: true
}));
```

## Summary

**You already have your own API built into the app!**

✅ **Location:** `functions/index.js`  
✅ **Hosting:** Firebase Functions (same as frontend)  
✅ **URL:** `https://echochat-messaging.web.app/api/*`  
✅ **Add endpoints:** Just add routes to `functions/index.js`  
✅ **Deploy:** `firebase deploy --only functions`  

**Your API is:**
- ✅ Built into your app
- ✅ Hosted on Firebase
- ✅ Secure (server-side)
- ✅ Scalable
- ✅ Easy to extend

**To add more endpoints:** Just add more routes to `functions/index.js`!

