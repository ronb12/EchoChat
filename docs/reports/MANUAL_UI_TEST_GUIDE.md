# Manual UI Testing Guide - Money Features

## Prerequisites

1. **Backend Server Running:**
   ```bash
   npm run server
   ```
   Should show: `✅ Backend server is running`

2. **Frontend Running:**
   ```bash
   npm run dev
   ```
   Should open at `http://localhost:3000`

3. **Stripe Mode:**
   - **Recommended:** TEST mode for safe testing
   - Check mode: `npm run stripe:check`
   - Switch to test: `npm run stripe:test` (shows instructions)

## Test Cards (TEST Mode Only)

⚠️ **Only use these in TEST mode!**

### Success Card
- **Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Decline Card
- **Number:** `4000 0000 0000 0002`
- **Use:** To test error handling

### Requires Authentication
- **Number:** `4000 0027 6000 3184`
- **Use:** To test 3D Secure flow

## Test 1: Send Money

### Steps:

1. **Open EchoChat** in browser (`http://localhost:3000`)

2. **Login** to your account

3. **Select a chat** (or create a new one)

4. **Open the 3-dots menu** (⋮) in the chat header

5. **Click "Send Money"** 💵

6. **Fill in the form:**
   - **Amount:** `$10.00` (minimum $1.00, max $500.00)
   - **Reason:** Select from dropdown (e.g., "Dinner/Meal")
   - Or select "Other" and enter custom reason

7. **Click "Continue to Payment"**

8. **Verify Stripe card form appears:**
   - Should see card input field
   - Should show mode indicator (TEST/LIVE badge)

9. **Enter test card:**
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/34` (or any future date)
   - CVC: `123` (or any 3 digits)
   - ZIP: `12345` (or any 5 digits)

10. **Click "Pay $10.00"**

11. **Verify success:**
    - ✅ Success notification appears
    - ✅ Modal closes
    - ✅ Payment processed (check Stripe dashboard)

### Expected Results:

- ✅ Modal opens correctly
- ✅ Form validation works
- ✅ Stripe card form appears
- ✅ Payment processes successfully
- ✅ Success notification shown
- ✅ Modal closes

## Test 2: Request Money

### Steps:

1. **Open EchoChat** in browser

2. **Login** to your account

3. **Select a chat** (or create a new one)

4. **Open the 3-dots menu** (⋮) in the chat header

5. **Click "Request Money"** 📥

6. **Fill in the form:**
   - **Amount:** `$25.00`
   - **Reason:** Select from dropdown (e.g., "Rent/Utilities")

7. **Click "Request Money"**

8. **Verify success:**
    - ✅ Payment request created
    - ✅ Payment link generated
    - ✅ Link copied to clipboard (if supported)
    - ✅ Success notification shown
    - ✅ Modal closes

9. **Test the payment link:**
    - Paste the link in browser
    - Should open Stripe checkout page
    - Can complete payment with test card

### Expected Results:

- ✅ Modal opens correctly
- ✅ Form validation works
- ✅ Payment link generated
- ✅ Link copied to clipboard
- ✅ Success notification shown
- ✅ Modal closes
- ✅ Payment link works

## Test 3: Error Handling

### Test Invalid Amounts:

1. Try amount less than $1.00
   - ✅ Should show error: "Minimum amount is $1.00"

2. Try amount greater than $500.00
   - ✅ Should show error: "Maximum amount per transaction is $500"

3. Try empty amount
   - ✅ Should show error: "Please enter a valid amount"

4. Try without selecting reason
   - ✅ Should show error: "Please select or enter a reason"

### Test Card Errors:

1. Use decline card: `4000 0000 0000 0002`
   - ✅ Should show error message
   - ✅ Card form should highlight error

2. Use invalid card number
   - ✅ Should show validation error
   - ✅ Submit button should be disabled

## Visual Indicators to Check

### Header Badge:
- ✅ Should show "TEST" or "LIVE" badge in header
- ✅ Badge should be green (TEST) or red (LIVE)

### Modal Indicators:
- ✅ Send Money modal should show mode notice
- ✅ TEST mode: Green banner
- ✅ LIVE mode: Red warning banner

### Stripe Form:
- ✅ Card input should be styled correctly
- ✅ Error states should be visible
- ✅ Loading states should work

## Troubleshooting

### Issue: "Backend server not accessible"
**Solution:**
- Check server is running: `npm run server`
- Verify port 3001 is not in use
- Check server logs for errors

### Issue: "Stripe not configured"
**Solution:**
- Check `.env` file has `VITE_STRIPE_PUBLISHABLE_KEY`
- Verify key starts with `pk_test_` or `pk_live_`
- Restart frontend after updating `.env`

### Issue: "Payment intent creation failed"
**Solution:**
- Check backend server logs
- Verify `server/.env` has `STRIPE_SECRET_KEY`
- Ensure server was restarted after setting key

### Issue: "Card form not appearing"
**Solution:**
- Check browser console for errors
- Verify Stripe publishable key is loaded
- Check network tab for API calls

## Success Criteria

✅ All tests pass:
- Send Money creates payment intent
- Stripe card form appears
- Payment processes with test card
- Request Money creates payment link
- Payment link works
- Error handling works correctly
- Visual indicators show correct mode

## Notes

- **TEST Mode:** Safe for testing, no real charges
- **LIVE Mode:** ⚠️ Real payments - use with caution!
- **Test Cards:** Only work in TEST mode
- **Real Cards:** Will be charged in LIVE mode

## Next Steps After Testing

1. ✅ Verify all features work
2. ✅ Check error handling
3. ✅ Verify visual indicators
4. ✅ Test on different browsers
5. ✅ Test on mobile devices
6. ✅ Document any issues found



