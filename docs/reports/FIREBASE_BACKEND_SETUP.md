# EchoChat API Setup - Firebase Functions

EchoChat API is now integrated into Firebase Functions! Everything runs within your Firebase project.

## Benefits

✅ **No separate hosting needed** - Backend runs in Firebase  
✅ **Same deployment process** - Deploy with `firebase deploy`  
✅ **Automatic scaling** - Firebase handles scaling  
✅ **Integrated security** - Same Firebase authentication  
✅ **Cost effective** - Pay only for what you use  

## Quick Setup

### 1. Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### 2. Configure Stripe Keys

Set Firebase Functions configuration:

```bash
firebase functions:config:set stripe.secret_key="sk_live_YOUR_KEY"
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
firebase functions:config:set app.frontend_url="https://echochat-messaging.web.app"
```

### 3. Deploy Functions

```bash
firebase deploy --only functions
```

That's it! Your backend is now live at:
`https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api`

## API Endpoints

All endpoints are available at `/api/*`:

- `GET /api/health` - Health check
- `POST /api/stripe/create-account` - Create Stripe account
- `GET /api/stripe/account-status/:userId` - Get account status
- `POST /api/stripe/create-payment-intent` - Create payment intent
- `GET /api/stripe/subscription/:userId` - Get subscription
- `POST /api/stripe/create-checkout-session` - Create checkout
- `POST /api/stripe/create-portal-session` - Customer portal
- `POST /api/stripe/webhook` - Stripe webhooks

## Frontend Configuration

Update your frontend to use the Firebase Functions URL:

```env
VITE_API_BASE_URL=https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net
```

Or use the automatic rewrite (no config needed):
- Firebase hosting automatically rewrites `/api/*` to your function
- So you can use: `VITE_API_BASE_URL=https://echochat-messaging.web.app`

## Deployment

### Deploy Everything Together:

```bash
# Deploy functions + frontend
firebase deploy

# Or individually
firebase deploy --only functions
firebase deploy --only hosting
```

## Environment Variables

Set in Firebase Functions config:

```bash
# Stripe keys
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# App settings
firebase functions:config:set app.frontend_url="https://echochat-messaging.web.app"

# View current config
firebase functions:config:get
```

## Webhook Configuration

In Stripe Dashboard:
1. Go to Webhooks
2. Add endpoint: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api/api/stripe/webhook`
3. Select events (see DEPLOYMENT_GUIDE.md)
4. Copy signing secret
5. Set: `firebase functions:config:set stripe.webhook_secret="whsec_..."`

## Testing Locally

```bash
# Start Firebase emulators
firebase emulators:start

# Functions will be available at:
# http://localhost:5001/YOUR_PROJECT/us-central1/api
```

## Benefits Over Separate Server

| Feature | Separate Server | Firebase Functions |
|---------|----------------|-------------------|
| Hosting | Separate platform | Same as frontend |
| Deployment | Separate process | One command |
| Scaling | Manual | Automatic |
| Cost | Fixed monthly | Pay per use |
| Setup | Complex | Simple |
| Security | Manage CORS | Built-in |

## Next Steps

1. ✅ Install dependencies: `cd functions && npm install`
2. ✅ Set config: `firebase functions:config:set ...`
3. ✅ Deploy: `firebase deploy --only functions`
4. ✅ Update frontend API URL (or use automatic rewrite)
5. ✅ Configure webhooks in Stripe Dashboard

That's it! Your backend is now part of your Firebase app! 🎉

