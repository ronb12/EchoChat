# Complete Deployment Guide

This guide walks you through deploying EchoChat to production.

## Quick Start

1. **Set up environment variables:** `./scripts/setup-production-env.sh`
2. **Deploy backend:** `./scripts/deploy-backend.sh`
3. **Build frontend:** `./scripts/build-production.sh`
4. **Deploy frontend:** `npm run deploy`

---

## Step 1: Get Stripe LIVE Keys

1. Go to https://dashboard.stripe.com/apikeys
2. **Switch to LIVE mode** (toggle in top right)
3. Copy:
   - **Publishable key:** `pk_live_...`
   - **Secret key:** `sk_live_...`

⚠️ **Important:** Test keys (`pk_test_...`) will NOT work in production!

---

## Step 2: Set Up Production Environment

### Option A: Automated Setup (Recommended)

```bash
./scripts/setup-production-env.sh
```

This script will:
- Prompt for Stripe LIVE keys
- Ask for backend URL
- Create `.env.production` files
- Validate all inputs

### Option B: Manual Setup

#### Frontend (.env.production):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
VITE_API_BASE_URL=https://your-backend-url.com
```

#### Backend (server/.env.production):
```env
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
CORS_ORIGIN=https://echochat-messaging.web.app
FRONTEND_URL=https://echochat-messaging.web.app
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
PORT=3001
```

---

## Step 3: Deploy Backend

### Option A: Railway (Easiest - Recommended)

#### Quick Deploy:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize and deploy
cd server
railway init
railway up
```

#### Set Environment Variables in Railway Dashboard:
1. Go to your Railway project
2. Select the service
3. Go to "Variables" tab
4. Add:
   - `NODE_ENV=production`
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `CORS_ORIGIN=https://echochat-messaging.web.app`
   - `FRONTEND_URL=https://echochat-messaging.web.app`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`

#### Get Your Backend URL:
After deployment, Railway provides a URL like:
`https://echochat-backend.railway.app`

Copy this URL - you'll need it for frontend configuration!

### Option B: Render

1. Go to https://render.com
2. **New → Web Service**
3. Connect GitHub repository
4. Configure:
   - **Name:** `echochat-backend`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Set environment variables (see above)
6. Click **Create Web Service**
7. Wait for deployment
8. Copy the URL (e.g., `https://echochat-backend.onrender.com`)

### Option C: Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create echochat-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set CORS_ORIGIN=https://echochat-messaging.web.app
heroku config:set FRONTEND_URL=https://echochat-messaging.web.app
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...

# Deploy
git push heroku main
```

### Option D: Docker

```bash
# Build image
cd server
docker build -t echochat-backend .

# Run container
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e STRIPE_SECRET_KEY=sk_live_... \
  -e CORS_ORIGIN=https://echochat-messaging.web.app \
  -e FRONTEND_URL=https://echochat-messaging.web.app \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  --name echochat-backend \
  echochat-backend
```

### Option E: Using Deployment Script

```bash
# Interactive menu
./scripts/deploy-backend.sh

# Or specify platform
./scripts/deploy-backend.sh railway
./scripts/deploy-backend.sh heroku
./scripts/deploy-backend.sh docker
```

---

## Step 4: Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter endpoint URL: `https://your-backend-url.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add to backend environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Step 5: Build Frontend

### Option A: Automated Build Script

```bash
./scripts/build-production.sh
```

This script:
- Validates environment variables
- Checks for LIVE Stripe keys
- Builds frontend
- Verifies build output

### Option B: Manual Build

```bash
# Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

# Build
npm run build

# Preview (optional)
npm run preview
```

### Verify Build

Check that `dist/` contains:
- `index.html`
- `assets/` directory with JS/CSS files
- No errors in build output

---

## Step 6: Deploy Frontend

### Firebase Hosting

```bash
# Deploy
npm run deploy

# Or deploy everything
npm run deploy:all
```

### Verify Deployment

1. Visit https://echochat-messaging.web.app
2. Open browser console
3. Check for errors
4. Verify API calls work (check Network tab)

---

## Step 7: Test Production

### Checklist:

- [ ] Frontend loads without errors
- [ ] No console errors
- [ ] API calls succeed (check Network tab)
- [ ] Stripe checkout works (test with small amount)
- [ ] Subscription creation works
- [ ] Webhooks are received (check backend logs)
- [ ] Payment failures handled correctly
- [ ] Feature locking works

### Test Payment Flow:

1. **Create account** → Should redirect to Stripe Checkout
2. **Complete checkout** → Should start 7-day trial
3. **Check subscription** → Should show trial status
4. **Wait for trial end** → Should charge automatically
5. **Test payment failure** → Should lock features

---

## Troubleshooting

### Backend Not Connecting

**Symptom:** Frontend can't reach backend API

**Fix:**
1. Verify backend URL is correct in `VITE_API_BASE_URL`
2. Check CORS configuration includes Firebase URL
3. Verify backend is running: `curl https://your-backend-url.com/health`
4. Check backend logs for errors

### Stripe Payments Not Working

**Symptom:** Payments fail or test cards don't work

**Fix:**
1. Verify using LIVE keys (not test keys)
2. Check Stripe Dashboard for errors
3. Verify webhook endpoint is configured
4. Check backend logs for Stripe API errors

### CORS Errors

**Symptom:** Browser shows CORS errors

**Fix:**
1. Verify `CORS_ORIGIN` includes your Firebase URL
2. Check `NODE_ENV=production` is set
3. Verify backend allows your domain

### Webhooks Not Received

**Symptom:** Subscription events not processed

**Fix:**
1. Verify webhook endpoint URL is correct
2. Check webhook secret matches Stripe Dashboard
3. Check backend logs for webhook errors
4. Test webhook in Stripe Dashboard → Send test webhook

---

## Environment Variables Reference

### Frontend (Build-time)
| Variable | Required | Example |
|----------|----------|---------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ Yes | `pk_live_...` |
| `VITE_API_BASE_URL` | ✅ Yes | `https://backend.railway.app` |

### Backend (Runtime)
| Variable | Required | Example |
|----------|----------|---------|
| `NODE_ENV` | ✅ Yes | `production` |
| `STRIPE_SECRET_KEY` | ✅ Yes | `sk_live_...` |
| `CORS_ORIGIN` | ✅ Yes | `https://echochat-messaging.web.app` |
| `FRONTEND_URL` | ✅ Yes | `https://echochat-messaging.web.app` |
| `STRIPE_WEBHOOK_SECRET` | ✅ Yes | `whsec_...` |
| `PORT` | ⚠️ Optional | `3001` (default) |

---

## Deployment Platforms Comparison

| Platform | Free Tier | Ease | Setup Time |
|----------|-----------|------|------------|
| **Railway** | ✅ Yes | ⭐⭐⭐⭐⭐ | 5 min |
| **Render** | ✅ Yes | ⭐⭐⭐⭐ | 10 min |
| **Heroku** | ❌ No | ⭐⭐⭐ | 15 min |
| **DigitalOcean** | ❌ No | ⭐⭐ | 20 min |
| **AWS/GCP** | ⚠️ Limited | ⭐ | 30+ min |

**Recommended:** Railway (easiest) or Render (good free tier)

---

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed to Firebase
- [ ] Stripe LIVE keys configured
- [ ] Webhooks configured and tested
- [ ] Environment variables set
- [ ] CORS configured correctly
- [ ] Payment flow tested
- [ ] Subscription creation tested
- [ ] Webhook events received
- [ ] Error handling verified
- [ ] Monitoring/logging set up (optional)

---

## Support

If you encounter issues:

1. Check backend logs
2. Check Stripe Dashboard → Logs
3. Check browser console
4. Verify all environment variables are set
5. Review this guide's troubleshooting section

---

**Last Updated:** $(date)  
**Status:** Production Ready ✅


