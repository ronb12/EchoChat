# EchoChat API

Complete backend API for EchoChat messaging platform.

## Overview

EchoChat API is a Firebase Cloud Functions-based backend that handles:
- Stripe payment processing
- Subscription management
- Account creation and management
- Webhook processing
- Payment intents and transfers

## Architecture

```
Frontend (Firebase Hosting)
    ↓
/api/* requests
    ↓
EchoChat API (Firebase Functions)
    ↓
Stripe API / Firestore
```

## API Endpoints

### Health Check
- `GET /api/health` - API health status

### Stripe Connect
- `POST /api/stripe/create-account` - Create Stripe Connect account
- `GET /api/stripe/account-status/:userId` - Get account status
- `POST /api/stripe/create-account-link` - Create onboarding link

### Payments
- `POST /api/stripe/create-payment-intent` - Create payment intent for sending money

### Subscriptions
- `GET /api/stripe/subscription/:userId` - Get subscription status
- `POST /api/stripe/create-checkout-session` - Create subscription checkout
- `POST /api/stripe/create-portal-session` - Create customer portal session

### Webhooks
- `POST /api/stripe/webhook` - Stripe webhook handler

## Base URL

**Production:**
```
https://echochat-messaging.web.app/api
```

**Local Development:**
```
http://localhost:5001/YOUR_PROJECT/us-central1/api
```

## Authentication

EchoChat API uses Firebase Authentication. Include the auth token in requests:

```javascript
const token = await user.getIdToken();
const response = await fetch('/api/stripe/create-account', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userId, email })
});
```

## Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { ... }
}
```

Errors:
```json
{
  "error": "Error message"
}
```

## Version

**Current Version:** 1.0.0

## Deployment

```bash
# Deploy EchoChat API
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

## Configuration

Set environment variables:

```bash
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase functions:config:set app.frontend_url="https://echochat-messaging.web.app"
```

## Documentation

- [API Architecture](./API_ARCHITECTURE_EXPLAINED.md)
- [Setup Guide](./FIREBASE_BACKEND_SETUP.md)
- [Integrated Backend Guide](./INTEGRATED_BACKEND_GUIDE.md)

## Support

For issues or questions about EchoChat API, check the documentation or contact support.

---

**EchoChat API v1.0.0** - Built with Firebase Cloud Functions


