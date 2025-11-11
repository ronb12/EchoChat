# Manage Button Test Guide

## Quick Test Steps

### Prerequisites
1. **Start the dev server**: `npm run dev`
2. **Start the backend server** (optional for test account): `npm run server:dev`
3. Open browser to the app URL (usually `http://localhost:5173` or `http://localhost:3000`)

---

## Step-by-Step Test

### 1. Login as Business Account
- Click "Login" or "Demo" button
- Select "Business Account" type
- Click "Test Business Account" button
- **OR** use: `business@echochat.com`

### 2. Open Settings Modal
- Click on **user avatar** (top right corner)
- Click **"Settings"** from the dropdown menu
- Settings modal should open

### 3. Navigate to Balance & Payments Section
- In the Settings modal, **scroll down** to find "Balance & Payments" section
- You should see:
  - Available Balance display
  - "Cash Out" button
  - **"⚙️ Manage" button** ← This is what we're testing

### 4. Test Manage Button

#### For Test Business Account (`business@echochat.com`):

**Expected Behavior:**
1. **Click the "⚙️ Manage" button**
2. **Console should show**: `Manage button clicked { stripeAccountId: 'test-business-1', isTestBusiness: true }`
3. **Notification should appear**: "Manage account feature is available for real Stripe accounts. In production, this will open Stripe Connect account settings."

**What to Check:**
- ✅ Button is visible and enabled (not grayed out)
- ✅ Button click triggers the handler
- ✅ Console log appears in browser console (F12)
- ✅ Notification appears with correct message
- ✅ No errors in console

---

## Manual Verification Checklist

### Before Testing:
- [ ] Dev server is running (`npm run dev`)
- [ ] Logged in as business account
- [ ] Settings modal is open
- [ ] Scrolled to Balance & Payments section

### Button Visibility:
- [ ] "⚙️ Manage" button is visible
- [ ] Button is NOT disabled (should be clickable)
- [ ] Button text shows "⚙️ Manage" or just "Manage"

### Button Functionality:
- [ ] Click the button
- [ ] Browser console shows "Manage button clicked" log
- [ ] Notification appears (check top of screen or as toast)
- [ ] Notification message is correct for test account

### Console Checks:
Open browser console (F12 → Console tab) and look for:
- [ ] `Manage button clicked { stripeAccountId: 'test-business-1', isTestBusiness: true }`
- [ ] No red error messages
- [ ] No network errors (404, 500, etc.)

---

## Expected Console Output

When you click the Manage button, you should see in the console:

```
Manage button clicked { stripeAccountId: 'test-business-1', isTestBusiness: true }
```

---

## Troubleshooting

### If Button Doesn't Work:

1. **Check Console for Errors:**
   - Open browser console (F12)
   - Look for red error messages
   - Check if API calls are failing

2. **Check if Button is Disabled:**
   - Button might be disabled if `stripeAccountId` is not set
   - For test account, it should be set to `'test-business-1'`

3. **Check Network Tab:**
   - Open browser DevTools → Network tab
   - Click the Manage button
   - Check if any API calls are made
   - Look for errors (404, 500, CORS, etc.)

4. **Verify Settings Modal is Open:**
   - Make sure you're actually in the Settings modal
   - Balance & Payments section should be visible

5. **Check if Backend is Running:**
   - For test account, backend is optional (uses sample data)
   - For real account, backend must be running

---

## Test Results Template

### Test Date: ___________

### Test Account: Test Business Account (`business@echochat.com`)

### Results:
- [ ] Button visible: ✅ / ❌
- [ ] Button enabled: ✅ / ❌
- [ ] Button clickable: ✅ / ❌
- [ ] Console log appears: ✅ / ❌
- [ ] Notification appears: ✅ / ❌
- [ ] Notification message correct: ✅ / ❌
- [ ] No errors in console: ✅ / ❌

### Issues Found:
- _________________________________________________
- _________________________________________________

### Notes:
- _________________________________________________
- _________________________________________________

---

## Automated Test

To run the automated test:
```bash
npm run dev  # Start dev server first
node test-manage-button.js
```

The automated test will:
1. Login as business user
2. Open Settings modal
3. Find and click Manage button
4. Verify console log and notification
5. Take screenshot for debugging

---

## Code Verification

The Manage button should be located in `src/components/SettingsModal.jsx` around line 996-1054.

Key features:
- `onClick` handler with `e.preventDefault()` and `e.stopPropagation()`
- Console logging for debugging
- Test account detection
- Proper error handling
- API call to `/api/stripe/create-account-link`

---

## Success Criteria

✅ **Button Works If:**
1. Button is visible and clickable
2. Console shows "Manage button clicked" log
3. Notification appears with appropriate message
4. No JavaScript errors in console
5. For test account: Shows info message (not redirects)

❌ **Button Doesn't Work If:**
1. Button is disabled/grayed out
2. Clicking does nothing
3. Console shows errors
4. No notification appears
5. Network errors in DevTools

---

## Next Steps After Testing

If button works:
- ✅ Feature is working correctly
- Document any UI improvements needed

If button doesn't work:
1. Check browser console for errors
2. Verify API_BASE_URL is correct
3. Check if backend server is needed
4. Review the onClick handler code
5. Test with real Stripe account (if applicable)



