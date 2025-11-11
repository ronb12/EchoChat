# Quick Deployment Guide

## One-Command Deployment

Run the complete deployment wizard:

```bash
npm run deploy:production
```

Or directly:

```bash
./scripts/deploy-production.sh
```

## What It Does

The deployment wizard will:

1. ✅ **Guide you through getting Stripe LIVE keys**
2. ✅ **Help deploy backend** (Railway/Render/Heroku)
3. ✅ **Configure Stripe webhooks**
4. ✅ **Build frontend** with production environment
5. ✅ **Deploy frontend** to Firebase

## Prerequisites

Before running, make sure you have:

- [ ] Stripe account with LIVE mode access
- [ ] Railway/Render/Heroku account (for backend)
- [ ] Firebase project connected
- [ ] Git repository up to date

## Step-by-Step (Manual)

If you prefer manual steps:

### 1. Get Stripe LIVE Keys

```bash
# Open Stripe Dashboard
open https://dashboard.stripe.com/apikeys

# Switch to LIVE mode (toggle top right)
# Copy:
# - Publishable key: pk_live_...
# - Secret key: sk_live_...
```

### 2. Deploy Backend

**Railway (Recommended):**
```bash
npm i -g @railway/cli
cd server
railway login
railway init
railway up

# Set environment variables in Railway dashboard:
# - NODE_ENV=production
# - STRIPE_SECRET_KEY=sk_live_...
# - CORS_ORIGIN=https://echochat-messaging.web.app
# - FRONTEND_URL=https://echochat-messaging.web.app
```

**Render:**
1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Root Directory: `server`
5. Build: `npm install`
6. Start: `npm start`
7. Set environment variables

### 3. Configure Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-backend-url/api/stripe/webhook`
3. Select events (see DEPLOYMENT_GUIDE.md)
4. Copy signing secret: `whsec_...`
5. Add to backend env: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 4. Build & Deploy Frontend

```bash
# Set environment variables
export VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
export VITE_API_BASE_URL=https://your-backend-url

# Build
npm run build

# Deploy
npm run deploy
```

## Troubleshooting

See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting.

## Quick Reference

| Task | Command |
|------|---------|
| Full deployment | `npm run deploy:production` |
| Setup only | `npm run deploy:setup` |
| Backend only | `npm run deploy:backend` |
| Build only | `npm run deploy:build` |
| Frontend only | `npm run deploy` |

---

**Ready to deploy?** Run: `npm run deploy:production`


