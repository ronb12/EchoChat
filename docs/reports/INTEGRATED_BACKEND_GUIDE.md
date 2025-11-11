# EchoChat API Guide - Integrated Backend

## ✅ EchoChat API is Built Into Your App!

EchoChat API is integrated into Firebase Functions. **No separate hosting needed!**

## How It Works

1. **Backend runs in Firebase Functions** - Same platform as your frontend
2. **Automatic URL rewriting** - `/api/*` routes automatically go to your function
3. **Single deployment** - Deploy everything with `firebase deploy`
4. **No CORS issues** - Same origin, no CORS needed

## Quick Deployment

### Option 1: Automated Script

```bash
./scripts/deploy-firebase-backend.sh
```

This script will:
1. Install dependencies
2. Prompt for Stripe keys
3. Set Firebase config
4. Deploy functions

### Option 2: Manual Steps

```bash
# 1. Install dependencies
cd functions
npm install
cd ..

# 2. Set Stripe keys
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase functions:config:set app.frontend_url="https://echochat-messaging.web.app"

# 3. Deploy
firebase deploy --only functions
```

## Frontend Configuration

Since your backend is integrated, you have two options:

### Option 1: Use Automatic Rewrite (Recommended)

Your `firebase.json` already has a rewrite rule that automatically routes `/api/*` to your function. So you can use:

```env
VITE_API_BASE_URL=https://echochat-messaging.web.app
```

All API calls to `/api/stripe/*` will automatically go to your Firebase Function!

### Option 2: Use Direct Function URL

```env
VITE_API_BASE_URL=https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net
```

## API Endpoints

All endpoints work the same way:

- `POST /api/stripe/create-account`
- `GET /api/stripe/account-status/:userId`
- `POST /api/stripe/create-payment-intent`
- `GET /api/stripe/subscription/:userId`
- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/create-portal-session`
- `POST /api/stripe/webhook`
- `GET /api/health`

## Benefits

✅ **No separate hosting** - Everything in Firebase  
✅ **Single deployment** - One command deploys everything  
✅ **Automatic scaling** - Firebase handles it  
✅ **No CORS issues** - Same origin  
✅ **Cost effective** - Pay per use  
✅ **Integrated security** - Firebase handles auth  

## Deployment

### Deploy Everything Together:

```bash
# Deploy functions + frontend + rules
firebase deploy
```

### Deploy Individually:

```bash
# Just functions
firebase deploy --only functions

# Just frontend
firebase deploy --only hosting

# Just rules
firebase deploy --only firestore:rules,storage
```

## Webhook Configuration

In Stripe Dashboard:
1. Go to Webhooks
2. Add endpoint: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api/api/stripe/webhook`
3. Or use the automatic rewrite: The webhook can be configured to use your Firebase hosting domain

## Testing Locally

```bash
# Start emulators
firebase emulators:start

# Functions available at:
# http://localhost:5001/YOUR_PROJECT/us-central1/api
```

## Environment Variables

Set via Firebase Functions config:

```bash
# View current config
firebase functions:config:get

# Set config
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase functions:config:set app.frontend_url="https://echochat-messaging.web.app"
```

## Comparison

| Feature | Separate Server | Firebase Functions |
|---------|----------------|-------------------|
| Hosting | Railway/Render/Heroku | Firebase (same as frontend) |
| Deployment | Separate process | `firebase deploy` |
| URL | `https://backend.railway.app` | `https://echochat-messaging.web.app/api` |
| CORS | Needs configuration | Automatic |
| Scaling | Manual | Automatic |
| Cost | Fixed monthly | Pay per use |

## Next Steps

1. ✅ Install functions dependencies: `npm run functions:install`
2. ✅ Set Stripe keys: `firebase functions:config:set ...`
3. ✅ Deploy functions: `npm run deploy:functions`
4. ✅ Update frontend API URL (or use automatic rewrite)
5. ✅ Configure Stripe webhooks
6. ✅ Deploy frontend: `npm run deploy`

## Summary

Your backend is now **fully integrated** into your Firebase app. No separate hosting, no CORS issues, single deployment command. Everything runs in one place! 🎉

