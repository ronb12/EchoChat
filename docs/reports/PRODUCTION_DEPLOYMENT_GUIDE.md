# Production Deployment Guide

## Quick Start

### 1. Backend Deployment (Required First)

Choose a hosting platform:

**Option A: Railway (Recommended - Easy)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Option B: Render**
1. Go to https://render.com
2. New → Web Service
3. Connect your GitHub repo
4. Set root directory: `server`
5. Build command: `npm install`
6. Start command: `node server.js`

**Option C: Heroku**
```bash
heroku create echochat-backend
heroku config:set NODE_ENV=production
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set CORS_ORIGIN=https://echochat-messaging.web.app
git push heroku main
```

### 2. Get Stripe Live Keys

1. Go to https://dashboard.stripe.com/apikeys
2. **Switch to LIVE mode** (toggle in top right)
3. Copy:
   - **Publishable key:** `pk_live_...`
   - **Secret key:** `sk_live_...`

### 3. Set Environment Variables

#### Frontend (.env.production or build-time):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
VITE_API_BASE_URL=https://your-backend-url.com
```

#### Backend (on hosting platform):
```bash
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
CORS_ORIGIN=https://echochat-messaging.web.app
FRONTEND_URL=https://echochat-messaging.web.app
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
PORT=3001
```

### 4. Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-backend-url.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
4. Copy signing secret → Add to backend env: `STRIPE_WEBHOOK_SECRET`

### 5. Build and Deploy Frontend

```bash
# Build with production environment
npm run build

# Deploy to Firebase
npm run deploy
```

### 6. Verify Production

1. ✅ Visit https://echochat-messaging.web.app
2. ✅ Check browser console for errors
3. ✅ Test payment flow (use small real amount first)
4. ✅ Verify webhooks are received (check backend logs)

## Production Checklist

### Backend:
- [ ] Deployed to production hosting
- [ ] HTTPS enabled
- [ ] `NODE_ENV=production` set
- [ ] `STRIPE_SECRET_KEY=sk_live_...` set
- [ ] `CORS_ORIGIN` includes Firebase hosting URL
- [ ] `STRIPE_WEBHOOK_SECRET` configured
- [ ] Webhook endpoint added in Stripe Dashboard

### Frontend:
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...` set
- [ ] `VITE_API_BASE_URL` points to production backend
- [ ] Built with `npm run build`
- [ ] Deployed to Firebase hosting

### Testing:
- [ ] Test with real card (small amount)
- [ ] Verify subscription creation
- [ ] Test payment failure handling
- [ ] Check webhook logs
- [ ] Verify feature locking works

## Security Checklist

- [ ] CORS restricted to production domains only
- [ ] No test keys in production code
- [ ] Webhook signature verification enabled
- [ ] Error messages don't expose sensitive info
- [ ] API keys not in client-side code
- [ ] HTTPS enabled everywhere

## Troubleshooting

### Backend not connecting:
- Check `VITE_API_BASE_URL` is set correctly
- Verify backend is running and accessible
- Check CORS configuration includes Firebase URL

### Payments not working:
- Verify Stripe keys are LIVE (not test)
- Check Stripe Dashboard for errors
- Verify webhook endpoint is configured

### CORS errors:
- Ensure backend `CORS_ORIGIN` includes Firebase URL
- Check `NODE_ENV=production` is set on backend
- Verify backend allows your Firebase domain

## Production URLs

After deployment, update:
- Frontend: https://echochat-messaging.web.app ✅ (already deployed)
- Backend: https://your-backend-url.com (needs deployment)

## Support

If issues occur:
1. Check backend logs
2. Check Stripe Dashboard → Logs
3. Check browser console
4. Verify all environment variables are set


