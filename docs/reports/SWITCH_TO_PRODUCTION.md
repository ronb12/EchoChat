# 🚀 Quick Guide: Switch to Production Mode

## Current Status
- ✅ Code: Production-ready
- ⚠️ Configuration: Using TEST keys (needs LIVE keys)
- ⚠️ API URL: localhost (needs production URL)

---

## Option 1: Interactive Script (Easiest)

```bash
./scripts/switch-to-production.sh
```

This script will:
1. Prompt you for LIVE Stripe keys
2. Validate key formats
3. Update all configuration files
4. Configure Firebase Functions
5. Provide next steps

---

## Option 2: Manual Setup

### Step 1: Get Your LIVE Stripe Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. **Switch to LIVE mode** (toggle in top right)
3. Copy:
   - **Publishable key:** `pk_live_...`
   - **Secret key:** `sk_live_...`

### Step 2: Update Frontend Configuration

Create or update `.env.production` in the root directory:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_LIVE_KEY
VITE_API_BASE_URL=https://echochat-messaging.web.app
NODE_ENV=production
```

### Step 3: Configure Firebase Functions

Set the Stripe secret key in Firebase Functions:

```bash
firebase functions:config:set stripe.secret_key="sk_live_YOUR_ACTUAL_LIVE_KEY"
```

### Step 4: Build for Production

```bash
npm run build
```

### Step 5: Deploy

```bash
firebase deploy
```

---

## Important Notes

### ✅ Firebase Functions Auto-Routing
Your app uses Firebase Functions with automatic API routing. This means:
- API calls to `/api/**` automatically route to Firebase Functions
- No separate backend URL needed
- Uses same domain: `echochat-messaging.web.app`

### ⚠️ Security
- **Never commit LIVE keys to git**
- `.env.production` should be in `.gitignore`
- Use Firebase Functions config for server-side keys

### 📋 After Deployment

1. **Configure Stripe Webhooks:**
   - URL: `https://echochat-messaging.web.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Get webhook secret from Stripe Dashboard

2. **Set Webhook Secret:**
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
   ```

3. **Verify:**
   ```bash
   npm run stripe:check
   ```
   Should show: `Mode: LIVE`

---

## Verification Commands

```bash
# Check Stripe mode
npm run stripe:check

# Check production readiness
node scripts/check-production-mode.js

# Test API endpoint (after deployment)
curl https://echochat-messaging.web.app/api/health
```

---

## Need Help?

See `PRODUCTION_SWITCH_GUIDE.md` for detailed instructions.

