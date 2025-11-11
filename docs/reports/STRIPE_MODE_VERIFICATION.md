# Stripe Mode Verification Guide

This guide explains how to verify whether Stripe is configured in **TEST** or **LIVE** mode.

## Quick Verification

### Method 1: Check the UI Indicator

When you're logged into EchoChat, look at the **header** (top of the screen):

- **🟢 TEST** badge = Test mode (safe for development)
- **🔴 LIVE** badge = Live mode (real payments!)

The indicator appears next to the "Online" status in the header.

### Method 2: Check Console Logs

1. Open your browser's Developer Console (F12 or Cmd+Option+I)
2. Look for these messages when the app loads:

```
✅ Stripe TEST MODE - Using test environment
```

or

```
⚠️ Stripe LIVE MODE detected - Real payments will be processed!
```

### Method 3: Use the Verification Script

Run the built-in verification script:

```bash
node scripts/switch-stripe-mode.js check
```

This will show:
- Current mode (TEST/LIVE)
- Masked keys (first 12 and last 4 characters)
- Whether frontend and backend keys match

### Method 4: Check Environment Variables

#### Frontend Key (`.env` file in root):

```bash
grep VITE_STRIPE_PUBLISHABLE_KEY .env
```

**Test mode:** `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`  
**Live mode:** `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

#### Backend Key (`server/.env` file):

```bash
grep STRIPE_SECRET_KEY server/.env
```

**Test mode:** `STRIPE_SECRET_KEY=sk_test_...`  
**Live mode:** `STRIPE_SECRET_KEY=sk_live_...`

## Key Format Reference

### Test Keys
- **Publishable:** `pk_test_51...` (starts with `pk_test_`)
- **Secret:** `sk_test_51...` (starts with `sk_test_`)

### Live Keys
- **Publishable:** `pk_live_51...` (starts with `pk_live_`)
- **Secret:** `sk_live_51...` (starts with `sk_live_`)

## Important Notes

### ⚠️ LIVE Mode Warnings

When in LIVE mode:
- **Real payments will be processed**
- **Real money will be transferred**
- **Transactions are permanent**
- Use with extreme caution in development

### ✅ TEST Mode Safety

When in TEST mode:
- No real payments are processed
- Test cards can be used (e.g., `4242 4242 4242 4242`)
- Safe for development and testing
- All transactions are simulated

## Visual Indicators in the App

### Header Badge
- Located in the app header next to "Online" status
- **Green badge with ✅ TEST** = Test mode
- **Red badge with ⚠️ LIVE** = Live mode (with pulsing animation)

### Send Money Modal
- Shows a warning banner when in LIVE mode
- Shows a green info banner when in TEST mode
- Displays appropriate notices based on mode

## Switching Between Modes

See `scripts/switch-stripe-mode.js` for instructions:

```bash
# Check current mode
node scripts/switch-stripe-mode.js check

# Get instructions to switch to test mode
node scripts/switch-stripe-mode.js test

# Get instructions to switch to live mode
node scripts/switch-stripe-mode.js live
```

## Verification Checklist

- [ ] Check UI indicator in header
- [ ] Check console logs on app load
- [ ] Verify frontend key format (`.env`)
- [ ] Verify backend key format (`server/.env`)
- [ ] Ensure both keys are in the same mode
- [ ] Test with a test card if in TEST mode

## Troubleshooting

### Keys Don't Match

If frontend and backend are in different modes:

```bash
⚠️ WARNING: Mode mismatch!
   Frontend: TEST
   Backend: LIVE
```

**Solution:** Update both keys to the same mode.

### Keys Not Detected

If you see "Stripe not configured":

1. Check that `.env` file exists in root
2. Check that `server/.env` file exists (for backend)
3. Verify keys are not commented out (no `#` prefix)
4. Restart your development server after updating keys

### Mode Not Updating

If the UI indicator doesn't change:

1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Restart the development server
4. Check that environment variables are loaded correctly

## Security Best Practices

1. **Never commit live keys to git**
   - Add `.env` and `server/.env` to `.gitignore`
   - Use `env.example` for documentation

2. **Use test keys for development**
   - Only use live keys in production
   - Test thoroughly in test mode first

3. **Rotate keys if exposed**
   - If keys are accidentally committed, rotate them immediately
   - Revoke old keys in Stripe dashboard

4. **Monitor Stripe dashboard**
   - Check for unexpected transactions
   - Set up webhook alerts
   - Review activity logs regularly

## Getting Your Keys

### Test Keys
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy "Publishable key" → Frontend `.env`
3. Copy "Secret key" → Backend `server/.env`

### Live Keys
1. Go to: https://dashboard.stripe.com/apikeys
2. **Switch to live mode** (toggle in dashboard)
3. Copy "Publishable key" → Frontend `.env`
4. Copy "Secret key" → Backend `server/.env`

⚠️ **Warning:** Only use live keys in production environments!



