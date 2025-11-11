# Deployment Checklist

Use this checklist to ensure all deployment steps are completed.

## Pre-Deployment

- [ ] Stripe LIVE keys obtained from dashboard
- [ ] Backend hosting platform chosen (Railway/Render/Heroku/etc.)
- [ ] GitHub repository is up to date
- [ ] All environment variables documented

## Step 1: Environment Setup

- [ ] Run `npm run deploy:setup` (or `./scripts/setup-production-env.sh`)
- [ ] `.env.production` file created
- [ ] `server/.env.production` file created
- [ ] Stripe LIVE keys verified (start with `pk_live_` and `sk_live_`)
- [ ] Backend URL determined (will get after deployment)

## Step 2: Backend Deployment

### Platform Setup:
- [ ] Account created on hosting platform
- [ ] Project/service created
- [ ] Repository connected (if using GitHub integration)

### Environment Variables Set:
- [ ] `NODE_ENV=production`
- [ ] `STRIPE_SECRET_KEY=sk_live_...`
- [ ] `CORS_ORIGIN=https://echochat-messaging.web.app`
- [ ] `FRONTEND_URL=https://echochat-messaging.web.app`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...` (after webhook setup)
- [ ] `PORT=3001` (if needed by platform)

### Deployment:
- [ ] Backend deployed successfully
- [ ] Backend URL obtained (e.g., `https://backend.railway.app`)
- [ ] Health check works: `curl https://backend-url/health`
- [ ] Backend logs accessible

## Step 3: Stripe Webhook Configuration

- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] Endpoint URL: `https://your-backend-url/api/stripe/webhook`
- [ ] Events selected:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `checkout.session.completed`
- [ ] Webhook secret copied (`whsec_...`)
- [ ] Webhook secret added to backend environment variables
- [ ] Test webhook sent from Stripe Dashboard
- [ ] Webhook received in backend logs

## Step 4: Frontend Configuration

- [ ] Backend URL updated in `.env.production`
- [ ] `VITE_API_BASE_URL` set to backend URL
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` set to LIVE key
- [ ] Environment variables verified

## Step 5: Frontend Build

- [ ] Run `npm run deploy:build` (or `./scripts/build-production.sh`)
- [ ] Build completed without errors
- [ ] `dist/` directory created
- [ ] Build output verified (files exist)
- [ ] Preview tested: `npm run preview`

## Step 6: Frontend Deployment

- [ ] Firebase project connected
- [ ] Run `npm run deploy`
- [ ] Deployment successful
- [ ] Frontend accessible at https://echochat-messaging.web.app

## Step 7: Production Testing

### Basic Checks:
- [ ] Frontend loads without errors
- [ ] Browser console shows no errors
- [ ] Network requests succeed (check DevTools)
- [ ] API calls reach backend (check Network tab)

### Payment Flow:
- [ ] User can create business account
- [ ] Redirects to Stripe Checkout
- [ ] Checkout completes successfully
- [ ] 7-day trial starts
- [ ] Subscription status shows correctly
- [ ] Trial end date displays correctly

### Webhook Testing:
- [ ] Test webhook from Stripe Dashboard
- [ ] Webhook received in backend logs
- [ ] Subscription events processed
- [ ] Payment success events handled
- [ ] Payment failure events handled

### Feature Testing:
- [ ] Business features unlocked during trial
- [ ] Payment method update works (Customer Portal)
- [ ] Feature locking works when payment fails
- [ ] Quick Reply feature works (business subscription required)

## Step 8: Monitoring & Verification

- [ ] Backend logs accessible
- [ ] Error tracking set up (optional)
- [ ] Stripe Dashboard monitored
- [ ] Webhook events verified
- [ ] Payment transactions verified

## Post-Deployment

- [ ] All tests passed
- [ ] Production environment stable
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified of deployment

## Rollback Plan (If Needed)

- [ ] Previous deployment tagged/backed up
- [ ] Rollback procedure documented
- [ ] Environment variables documented
- [ ] Database backup (if applicable)

---

## Quick Reference

### Commands:
```bash
# Setup environment
npm run deploy:setup

# Deploy backend
npm run deploy:backend

# Build frontend
npm run deploy:build

# Deploy frontend
npm run deploy

# Full deployment
npm run deploy:all
```

### URLs:
- Frontend: https://echochat-messaging.web.app
- Backend: `https://your-backend-url.com` (after deployment)
- Stripe Dashboard: https://dashboard.stripe.com
- Webhook Endpoint: `https://your-backend-url.com/api/stripe/webhook`

### Environment Variables:
See `DEPLOYMENT_GUIDE.md` for complete list.

---

**Status:** ✅ Ready for deployment  
**Last Updated:** $(date)


