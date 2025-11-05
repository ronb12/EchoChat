# Test Card Payments Guide

This guide explains how to test features that require card payments using Stripe test cards.

## Quick Start

```bash
npm run test:card-payments
```

## Prerequisites

1. **Stripe in TEST Mode**
   - Check mode: `npm run stripe:check`
   - Switch to test: Update `.env` and `server/.env` with `pk_test_...` and `sk_test_...`
   - Restart servers after changing keys

2. **Servers Running**
   ```bash
   # Terminal 1: Backend
   npm run server:dev
   
   # Terminal 2: Frontend
   npm run dev
   ```

## Test Cards

### Success Card (Recommended)
- **Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Decline Card (Error Testing)
- **Number:** `4000 0000 0000 0002`
- **Use:** Test error handling when payment fails

### 3D Secure Card (Authentication Testing)
- **Number:** `4000 0027 6000 3184`
- **Use:** Test 3D Secure authentication flow

## Features Tested

### 1. Business Subscription Checkout
- Tests subscription signup with 7-day free trial
- Collects payment method upfront
- Verifies checkout flow works correctly

### 2. Send Money (Peer-to-Peer)
- Tests sending money between users
- Verifies card payment processing
- Checks success notifications

### 3. Payment Decline (Manual)
- Tests error handling
- Requires manual interaction
- Shows how declined payments are handled

## Manual Testing Steps

### Test Business Subscription

1. **Open Settings**
   - Click Settings icon or avatar menu
   - Navigate to Business Settings section

2. **Start Subscription**
   - Click "Set Up Payments" or "Subscribe"
   - Should redirect to Stripe Checkout

3. **Enter Test Card**
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/34` (or any future date)
   - CVC: `123`
   - ZIP: `12345`

4. **Complete Checkout**
   - Click "Subscribe" or "Complete"
   - Should redirect back to app
   - Should see "Payment method saved! 7-day free trial started"

5. **Verify Subscription**
   - Check Settings → Subscription section
   - Should show "Free Trial" status
   - Should show trial end date

### Test Send Money

1. **Open a Chat**
   - Select any chat from sidebar
   - Or create a new chat

2. **Open More Menu**
   - Click 3-dots menu (⋮) in chat header
   - Or use keyboard shortcut

3. **Click Send Money**
   - Select "Send Money" from menu
   - Modal should open

4. **Fill Form**
   - Amount: `$10.00` (minimum $1.00)
   - Reason: Select from dropdown (e.g., "Dinner/Meal")
   - Click "Continue to Payment"

5. **Enter Card Details**
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`

6. **Submit Payment**
   - Click "Pay $10.00" or "Send"
   - Should see success notification
   - Modal should close

### Test Payment Decline

1. **Follow Send Money steps 1-4**

2. **Use Decline Card**
   - Card Number: `4000 0000 0000 0002`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`

3. **Submit Payment**
   - Should see error message
   - Payment should be declined
   - Card form should remain open

## Automated Test Script

The test script (`scripts/test-card-payments.js`) automates:

1. ✅ Checks Stripe mode (must be TEST)
2. ✅ Finds running frontend server
3. ✅ Navigates to app
4. ✅ Tests subscription checkout
5. ✅ Tests Send Money flow
6. ✅ Provides test card details

### Running Automated Tests

```bash
# Run full test suite
npm run test:card-payments

# Or run directly
node scripts/test-card-payments.js
```

### Test Output

The script will:
- Show progress for each test
- Display test card details
- Provide summary of results
- Keep browser open for 10 seconds after completion

## Troubleshooting

### Server Not Found
```
❌ No frontend server found on ports 3000, 3002, or 5173
```

**Solution:**
- Start frontend: `npm run dev`
- Check which port it's running on
- Script will try ports 3000, 3002, and 5173 automatically

### Stripe Live Mode Error
```
❌ ERROR: Stripe is in LIVE mode!
```

**Solution:**
1. Update `.env` with `pk_test_...`
2. Update `server/.env` with `sk_test_...`
3. Restart both servers
4. Run test again

### Card Form Not Loading
```
⚠️  Stripe card form not found
```

**Possible Causes:**
- Payment intent creation failed
- Stripe Elements not loaded
- Check browser console for errors
- Verify backend server is running

### Navigation Timeout
```
❌ Navigation timeout of 15000 ms exceeded
```

**Solution:**
- Wait for server to fully start
- Check server is responding on port
- Try accessing URL manually in browser
- Increase timeout in script if needed

## Expected Results

### Subscription Checkout
- ✅ Redirects to Stripe Checkout
- ✅ Card form appears
- ✅ Payment method saved
- ✅ Trial starts immediately
- ✅ No charge during trial

### Send Money
- ✅ Modal opens
- ✅ Card form appears
- ✅ Payment processes
- ✅ Success notification
- ✅ Modal closes

### Payment Decline
- ✅ Error message shown
- ✅ Payment not processed
- ✅ User can retry

## Verification

After testing, verify in Stripe Dashboard:

1. **Visit:** https://dashboard.stripe.com/test
2. **Check:**
   - Payments → Should see test payments
   - Customers → Should see test customers
   - Subscriptions → Should see trial subscriptions
   - Payment Intents → Should see created intents

## Best Practices

1. **Always use TEST mode** for testing
2. **Never use real cards** in test mode
3. **Check Stripe Dashboard** to verify results
4. **Test both success and failure** scenarios
5. **Test 3D Secure** if required by your business

## Test Card Reference

| Card Number | Purpose | Result |
|------------|---------|--------|
| `4242 4242 4242 4242` | Success | Payment succeeds |
| `4000 0000 0000 0002` | Decline | Payment declined |
| `4000 0027 6000 3184` | 3D Secure | Requires authentication |
| `4000 0000 0000 9995` | Insufficient funds | Payment fails |

## Additional Resources

- [Stripe Test Cards Documentation](https://stripe.com/docs/testing)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Test Cards Reference](https://stripe.com/docs/testing#cards)

