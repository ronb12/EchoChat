# Stripe Subscription Billing - When Customers Are Charged

## Current Implementation

### How It Works:
1. **Business Account Created** → Stripe Connect account created
2. **Subscription Created Automatically** → Subscription starts with 7-day trial
3. **Trial Period** → Customer has access for 7 days, NO charge during trial
4. **At End of Trial** → Stripe attempts to charge customer

### ⚠️ Important: Payment Method Required

**Current Behavior:**
- Subscription is created with `trial_period_days: 7`
- **NO payment method is attached** during account creation
- At the end of 7 days, Stripe will attempt to charge
- **If no payment method exists**, subscription becomes:
  - `incomplete` - if payment method was never added
  - `past_due` - if payment method exists but charge fails

### When Customers Are Charged:

**✅ Charge Occurs:**
- At the **END** of the 7-day trial period
- Only if a payment method is attached to the customer
- First charge: $30.00
- Subsequent charges: Monthly on the same date

**❌ Charge Does NOT Occur:**
- During the trial period (first 7 days are free)
- If no payment method is attached when trial ends
- If payment method is invalid/declined

## Recommended Fix

To ensure customers are charged at the end of trial, you should:

### Option 1: Require Payment Method Upfront (Recommended)
Use Stripe Checkout to collect payment method before starting trial:

```javascript
// Create checkout session with trial
const session = await stripe.checkout.sessions.create({
  customer_email: email,
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  subscription_data: {
    trial_period_days: 7
  }
});
```

### Option 2: Collect Payment Method During Trial
- Send customer to payment setup page
- Use Setup Intent to collect payment method
- Attach to customer before trial ends

### Option 3: Use Stripe Billing Portal
- Allow customers to add payment method via billing portal
- Stripe handles notifications and reminders

## Current Status

**What Happens Now:**
1. Business account created ✅
2. Subscription created with 7-day trial ✅
3. Customer has access during trial ✅
4. **At trial end:** Stripe tries to charge
5. **If no payment method:** Subscription becomes incomplete/past_due
6. Customer needs to add payment method to continue

## Next Steps

To ensure automatic charging:
1. Implement payment method collection during account creation
2. Or use Stripe Checkout before creating subscription
3. Or send reminder emails to add payment method before trial ends

