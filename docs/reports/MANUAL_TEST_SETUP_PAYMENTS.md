# Manual Test Guide: Set Up Payments Feature

## Quick Test Steps (2-3 minutes)

### Prerequisites
✅ Backend running: `npm run server:dev`  
✅ Frontend running: `npm run dev`  
✅ Stripe in TEST mode: `npm run stripe:check`

### Test Steps

#### 1. Open Settings
- Click your avatar/profile picture (top right)
- Or click Settings icon
- Or use keyboard shortcut: `Cmd+,` (Mac) or `Ctrl+,` (Windows)

#### 2. Find "Set Up Payments" Button
- Scroll to "Payments" or "Stripe Account" section
- Look for button: **"Set Up Payments"**
- Should be visible if you don't have a Stripe account yet

#### 3. Click "Set Up Payments"
- Click the button
- Should see one of two flows:

**Option A: Business Account (with subscription)**
- Redirects to Stripe Checkout
- Enter test card: `4242 4242 4242 4242`
- Expiry: `12/34`, CVC: `123`, ZIP: `12345`
- Complete checkout
- Should redirect back with success message
- 7-day free trial starts

**Option B: Personal Account**
- Redirects to Stripe Connect onboarding
- Complete business information
- Add bank account (test account)
- Complete verification
- Should redirect back

#### 4. Verify Success
- Check Settings → Should show account status
- For business: Should show subscription with trial info
- For personal: Should show account ready for payments

## Expected Results

### ✅ Success Indicators:
- Button click triggers redirect
- Stripe page loads (checkout or onboarding)
- Can complete flow with test card
- Redirects back to app
- Success notification appears
- Account status updates in Settings

### ❌ Failure Indicators:
- 404 error when clicking button
- CORS error in console
- Button doesn't respond
- No redirect to Stripe
- Error message appears

## Test Cards

Use these in TEST mode only:

**Success Card:**
- Number: `4242 4242 4242 4242`
- Expiry: `12/34` (any future date)
- CVC: `123` (any 3 digits)
- ZIP: `12345` (any 5 digits)

**Decline Card (for error testing):**
- Number: `4000 0000 0000 0002`

## Troubleshooting

### Button Not Found
- Check if account already exists
- Look for "Manage Account" or "Account Status" instead
- Account might already be set up

### 404 Error
- Check backend is running: `curl http://localhost:3001/health`
- Check API URL in console - should be `http://localhost:3001/api/stripe/...`
- Should NOT be `http://localhost:3001/api/api/stripe/...` (double /api)

### CORS Error
- Backend must allow your origin
- Check `server/server.js` CORS configuration
- Restart backend after CORS changes

### No Redirect
- Check browser console for errors
- Verify Stripe keys are set correctly
- Check network tab for API responses

## Quick Verification

After clicking "Set Up Payments", check:

1. **Browser Console:**
   - No errors
   - API call succeeds (200 status)
   - Checkout URL or onboarding URL returned

2. **Network Tab:**
   - `POST /api/stripe/create-account` → 200 OK
   - Response includes `checkoutUrl` or `onboardingUrl`

3. **Redirect:**
   - URL changes to Stripe domain
   - Can see Stripe checkout/onboarding page

## Test Summary

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Open Settings | Modal opens | ? | ⏳ |
| Find Button | Button visible | ? | ⏳ |
| Click Button | API call succeeds | ? | ⏳ |
| Stripe Redirect | Redirects to Stripe | ? | ⏳ |
| Complete Flow | Returns to app | ? | ⏳ |
| Account Created | Status updates | ? | ⏳ |


