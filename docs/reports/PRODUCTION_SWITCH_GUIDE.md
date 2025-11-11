# Production Mode Switch Guide

**Status:** ✅ Configuration files prepared  
**Action Required:** Add your LIVE Stripe keys

---

## Quick Start

### Option 1: Interactive Script (Recommended)
```bash
./scripts/switch-to-production.sh
```

This script will:
- Prompt you for LIVE Stripe keys
- Validate key formats
- Update all configuration files
- Configure Firebase Functions
- Provide next steps

### Option 2: Manual Configuration

#### Step 1: Get Stripe LIVE Keys
1. Go to: https://dashboard.stripe.com/apikeys
2. Copy your **LIVE** keys:
   - `pk_live_...` (Publishable Key)
   - `sk_live_...` (Secret Key)

#### Step 2: Update Environment Files

**Frontend (.env.production):**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_LIVE_KEY
VITE_API_BASE_URL=https://echochat-messaging.web.app
NODE_ENV=production
```

**Backend (functions/.env):**
```bash
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY
NODE_ENV=production
```

#### Step 3: Configure Firebase Functions
```bash
firebase functions:config:set stripe.secret_key="sk_live_YOUR_ACTUAL_LIVE_KEY"
```

#### Step 4: Build for Production
```bash
npm run build
```

#### Step 5: Deploy
```bash
firebase deploy
```

---

## Configuration Files

### `.env.production`
- **Purpose:** Frontend production environment variables
- **Location:** Root directory
- **Used by:** Vite build process
- **Variables:**
  - `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe LIVE publishable key
  - `VITE_API_BASE_URL` - Production API URL (Firebase hosting URL)
  - `NODE_ENV` - Set to `production`

### `functions/.env`
- **Purpose:** Firebase Functions environment variables
- **Location:** `functions/` directory
- **Used by:** Firebase Functions runtime
- **Variables:**
  - `STRIPE_SECRET_KEY` - Stripe LIVE secret key
  - `NODE_ENV` - Set to `production`

### Firebase Functions Config
- **Purpose:** Server-side configuration for Firebase Functions
- **Set with:** `firebase functions:config:set`
- **Variable:** `stripe.secret_key`

---

## Production URL Configuration

### Firebase Functions Auto-Routing
The app uses Firebase Functions with automatic routing configured in `firebase.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/**",
      "function": "api"
    }
  ]
}
```

This means:
- ✅ API calls to `/api/**` automatically route to Firebase Functions
- ✅ No separate backend URL needed
- ✅ Uses same domain as frontend (echochat-messaging.web.app)

### API Base URL Options

**Option 1: Firebase Hosting URL (Recommended)**
```bash
VITE_API_BASE_URL=https://echochat-messaging.web.app
```

**Option 2: Empty (Uses Relative URLs)**
```bash
VITE_API_BASE_URL=
```
The app will use relative URLs and Firebase Functions will handle routing.

---

## Verification

### Check Stripe Mode
```bash
npm run stripe:check
```
Should show: `Mode: LIVE`

### Check Production Mode
```bash
node scripts/check-production-mode.js
```
Should show: `✅ PRODUCTION READY`

### Test API Endpoint
After deployment, test:
```
https://echochat-messaging.web.app/api/health
```
Should return: `{"status":"ok","api":"EchoChat API"}`

---

## Webhook Configuration

After deploying, configure Stripe webhooks:

1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://echochat-messaging.web.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret (`whsec_...`)
5. Set in Firebase Functions:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
   ```

---

## Important Notes

### ⚠️ Security
- **Never commit LIVE keys to git**
- `.env.production` should be in `.gitignore`
- Use Firebase Functions config for server-side keys
- Use environment variables for build-time keys

### ⚠️ Testing
- Test thoroughly with LIVE keys before going public
- Use Stripe test mode for development
- Monitor Stripe Dashboard for errors

### ⚠️ Rollback
If you need to switch back to test mode:
```bash
# Restore .env with test keys
cp .env .env.backup
# Edit .env with test keys
# Rebuild and redeploy
```

---

## Troubleshooting

### "Stripe keys not working"
- Verify keys start with `pk_live_` and `sk_live_`
- Check Firebase Functions config: `firebase functions:config:get`
- Ensure keys are set in both `.env.production` and Firebase Functions

### "API calls failing"
- Verify `VITE_API_BASE_URL` is set correctly
- Check Firebase Functions are deployed
- Verify `firebase.json` rewrites are configured

### "Webhooks not working"
- Verify webhook URL is correct
- Check webhook secret is set in Firebase Functions
- Monitor Firebase Functions logs: `firebase functions:log`

---

## Next Steps After Configuration

1. ✅ Build: `npm run build`
2. ✅ Deploy: `firebase deploy`
3. ✅ Configure webhooks (see above)
4. ✅ Test with real payment method
5. ✅ Monitor Stripe Dashboard
6. ✅ Monitor Firebase Functions logs

---

## Support

If you encounter issues:
1. Check `PRODUCTION_MODE_STATUS.md` for current status
2. Run `node scripts/check-production-mode.js` for diagnostics
3. Check Firebase Functions logs
4. Verify Stripe Dashboard for errors


