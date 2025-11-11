# EchoChat API

Complete backend API for EchoChat messaging platform, built with Firebase Cloud Functions.

## About EchoChat API

EchoChat API is the backend service that powers EchoChat's payment processing, subscription management, and Stripe integration. It runs on Firebase Cloud Functions and is fully integrated with your Firebase hosting.

## Structure

```
functions/
├── index.js          # All API endpoints (Express app)
└── package.json      # Dependencies
```

## Current API Endpoints

### Stripe Integration
- `POST /api/stripe/create-account` - Create Stripe account
- `GET /api/stripe/account-status/:userId` - Get account status
- `POST /api/stripe/create-account-link` - Create onboarding link
- `POST /api/stripe/create-payment-intent` - Create payment intent
- `GET /api/stripe/subscription/:userId` - Get subscription
- `POST /api/stripe/create-checkout-session` - Create checkout
- `POST /api/stripe/create-portal-session` - Customer portal
- `POST /api/stripe/webhook` - Stripe webhooks

### Health Check
- `GET /api/health` - Server health

## Adding New Endpoints

### Example: Add Custom Endpoint

```javascript
// In functions/index.js

/**
 * Your custom endpoint
 * GET /api/custom-endpoint
 */
app.get('/api/custom-endpoint', async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Example: Firestore Integration

```javascript
/**
 * Get user data
 * GET /api/users/:userId
 */
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
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
```

## Deployment

```bash
# Deploy functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

## Local Development

```bash
# Start emulators
firebase emulators:start --only functions

# Functions available at:
# http://localhost:5001/YOUR_PROJECT/us-central1/api
```

## Configuration

Set environment variables:

```bash
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase functions:config:set app.frontend_url="https://echochat-messaging.web.app"
```

## Accessing Config in Code

```javascript
const stripeKey = functions.config().stripe?.secret_key;
const frontendUrl = functions.config().app?.frontend_url;
```

## API URL

Your API is available at:
- Production: `https://echochat-messaging.web.app/api/*`
- Local: `http://localhost:5001/YOUR_PROJECT/us-central1/api`

## Adding More Features

Just add more routes to `functions/index.js`! The Express app handles all routing.

