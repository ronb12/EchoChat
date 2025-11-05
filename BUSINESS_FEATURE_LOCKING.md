# Business Feature Locking System

## Overview
This document explains how business features are locked when payment fails or subscriptions are cancelled, and how users can manage their subscriptions.

## Feature Locking Mechanism

### When Features Are Locked

Business features are automatically locked when:
1. **No subscription exists** - User hasn't subscribed yet
2. **Payment failed** - Subscription status is `past_due`, `unpaid`, `incomplete`, or `incomplete_expired`
3. **Subscription cancelled** - Status is `canceled`

### When Features Are Unlocked

Business features are unlocked when:
1. **Active subscription** - Status is `active`
2. **Free trial** - Status is `trialing` (7-day trial period)

## Locked Features

The following business features are locked when subscription is not active:

### 1. **Business Settings** (Settings Modal)
- Business Name
- Business Status (Open/Closed/Away)
- Auto-Reply Message
- Business Hours
- Quick Reply Templates
- Save Business Settings button

### 2. **Quick Reply Feature** (ChatArea)
- Quick Reply button in chat menu
- Shows notification if accessed when locked
- Redirects to Settings to resolve subscription

## Visual Indicators

### Lock Icons (🔒)
- Appears next to locked feature labels
- Gray color to indicate disabled state
- Shows users which features require subscription

### Feature Lock Warning Banner
- Yellow/amber background
- Prominent lock icon
- Clear message explaining why features are locked
- Action button to resolve (Update Payment/Subscribe)

### Disabled UI Elements
- Reduced opacity (60%)
- "Not-allowed" cursor
- Disabled input/select elements
- Clear visual feedback that features are unavailable

## User Experience Flows

### Flow 1: Payment Failed After Trial

1. **Trial ends** → Payment attempt fails
2. **Subscription status** → Changes to `past_due`
3. **Feature lock** → Business features become locked
4. **Warning banner** → Appears in Settings with lock icon
5. **User action** → Clicks "Update Payment Method"
6. **Stripe Portal** → Opens to update payment method
7. **Payment retry** → Stripe automatically retries charge
8. **Features unlocked** → Once payment succeeds, subscription becomes `active`

### Flow 2: User Cancels During Trial

1. **During trial** → User clicks "Cancel Subscription"
2. **Confirmation message** → 
   - "You can continue using business features until the trial ends"
   - "You won't be charged"
   - "Business features will be locked after the trial ends"
3. **Subscription cancelled** → Status changes to `canceled` at period end
4. **After trial ends** → Features become locked
5. **User can resubscribe** → "Resubscribe" button available

### Flow 3: User Cancels Active Subscription

1. **Active subscription** → User clicks "Cancel Subscription"
2. **Confirmation message** → 
   - "You will continue to have access until the end of your billing period"
3. **Subscription cancelled** → Status changes to `canceled` at period end
4. **After period ends** → Features become locked
5. **User can resubscribe** → "Resubscribe" button available

## Implementation Details

### Helper Functions

#### `hasActiveBusinessSubscription()`
```javascript
// Returns true if subscription is active or trialing
const hasActiveBusinessSubscription = () => {
  if (isTestBusinessAccount()) return true;
  if (!subscription) return false;
  return subscription.status === 'active' || subscription.status === 'trialing';
};
```

#### `isBusinessFeaturesLocked()`
```javascript
// Returns true if features should be locked
const isBusinessFeaturesLocked = () => {
  if (isTestBusinessAccount()) return false;
  if (!subscription) return true;
  return subscription.status === 'past_due' || 
         subscription.status === 'unpaid' || 
         subscription.status === 'incomplete' ||
         subscription.status === 'incomplete_expired' ||
         subscription.status === 'canceled';
};
```

### Feature Checking in Components

#### SettingsModal
- All business settings check `hasActiveBusinessSubscription()` before allowing edits
- Save button disabled when locked
- Lock icons shown on labels

#### ChatArea
- Quick Reply button checks subscription status before opening
- Shows notification if locked
- Redirects to Settings modal

## Cancellation Options

### During Trial
- **Cancel anytime** → No charge
- **Continue using** → Features work until trial ends
- **After trial** → Features locked automatically

### Active Subscription
- **Cancel at period end** → Continue using until billing period ends
- **Cancel immediately** → Lose access right away (not recommended)

## User Notifications

### Trial Reminder
During trial, users see:
- Trial end date
- Days remaining
- **Important**: "Not planning to continue? Cancel anytime during your trial - you won't be charged"

### Payment Failed
When payment fails, users see:
- 🔴 Payment Failed alert
- Explanation of what happened
- What happens next (may lose access)
- "Update Payment Method" button

### Features Locked
When features are locked:
- 🔒 Lock icon on feature labels
- Warning banner at top of Business Settings
- Disabled inputs/buttons
- Clear call-to-action to resolve

## Best Practices

### For Users
1. **Monitor subscription status** → Check Settings regularly
2. **Update payment method** → Keep payment method current
3. **Cancel early** → If not planning to continue, cancel during trial
4. **Check email** → Stripe sends payment failure notifications

### For Developers
1. **Always check subscription status** → Before allowing business feature access
2. **Show clear feedback** → Users should know why features are locked
3. **Provide resolution paths** → Make it easy to fix subscription issues
4. **Graceful degradation** → If subscription check fails, allow access (graceful)

## Testing

### Test Scenarios
1. **No subscription** → Features should be locked
2. **Trial active** → Features should work
3. **Payment failed** → Features should be locked with update option
4. **Cancelled** → Features locked after period ends
5. **Resubscribe** → Features unlock after successful subscription

### Test Accounts
- Test business accounts always have access (for development)
- Real accounts check subscription status

## Summary

The feature locking system ensures that:
- ✅ Users only access business features when subscription is active
- ✅ Clear visual indicators show which features are locked
- ✅ Easy resolution paths (update payment, resubscribe)
- ✅ Clear messaging about cancellation options
- ✅ Graceful handling of payment failures
- ✅ Users can cancel during trial without being charged

