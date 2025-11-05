# Stripe Payment Failure Flow - After 7-Day Trial

## Overview
This document explains what happens when a payment is charged at the end of the 7-day trial but the payment method is declined.

## Payment Failure Process

### 1. **Trial Ends - Payment Attempted**
- At the end of the 7-day trial, Stripe automatically attempts to charge the payment method on file
- The charge amount is $30.00 (monthly subscription fee)

### 2. **Payment Declined**
If the payment method is declined (insufficient funds, expired card, etc.):

#### **Stripe Automatic Retry Logic:**
- Stripe automatically retries the failed payment **3 times**
- Retries occur at intervals: immediately, then after 1 day, then after 3 days
- Each retry attempt is logged and webhook events are sent

#### **Subscription Status Changes:**
- **Initial failure**: Subscription status becomes `past_due`
- **After retries fail**: Subscription may become `unpaid` or remain `past_due`
- **If payment never succeeds**: Subscription eventually becomes `incomplete_expired`

### 3. **What Happens to Customer Access**

#### **During Past Due Period:**
- Customer typically retains access to business features (grace period)
- Stripe continues to retry payment automatically
- Customer receives notifications about failed payment

#### **After Retries Fail:**
- Customer may lose access to business features
- Subscription remains in `past_due` or `unpaid` status
- Customer must update payment method to reactivate

### 4. **Customer Actions Required**

#### **Update Payment Method:**
- Customer sees a prominent warning in Settings when subscription is `past_due`
- **"Update Payment Method"** button opens Stripe Customer Portal
- Customer can:
  - Update expired/declined card
  - Add new payment method
  - View payment history
  - Manage subscription settings

#### **After Updating Payment Method:**
- Stripe automatically retries the charge with the new payment method
- If successful, subscription status returns to `active`
- Customer regains full access to business features

### 5. **Webhook Events**

The backend receives webhook events during this process:

- **`invoice.payment_failed`**: Fired when payment fails (each retry attempt)
- **`customer.subscription.updated`**: Fired when subscription status changes
- **`invoice.payment_succeeded`**: Fired when payment eventually succeeds

### 6. **Backend Handling**

Enhanced webhook handler logs:
- Failed invoice details (amount, customer, subscription)
- Attempt count (which retry this is)
- Subscription status after failure
- Action required notifications

### 7. **Frontend UI**

#### **Subscription Status Display:**
- **Active/Trialing**: Green status indicator
- **Past Due/Unpaid**: Red status indicator with warning message
- **Cancelled**: Gray status indicator

#### **Payment Failed Warning:**
When subscription is `past_due`, customer sees:
- 🔴 **Payment Failed** alert
- Explanation of what happened
- Clear instructions on what to do next
- **"Update Payment Method"** button (opens Stripe Customer Portal)

#### **Active Subscription Actions:**
- **"Manage Payment"** button: Opens Customer Portal to update payment method proactively
- **"Cancel Subscription"** button: Cancel subscription at period end

### 8. **Best Practices**

#### **For Customers:**
1. Ensure payment method has sufficient funds before trial ends
2. Update expired cards proactively
3. Monitor email notifications from Stripe
4. Update payment method immediately if payment fails

#### **For Business:**
1. Monitor webhook events for payment failures
2. Send email notifications to customers when payment fails
3. Provide clear instructions in UI for updating payment method
4. Consider grace period before revoking access

### 9. **Technical Implementation**

#### **Backend Endpoints:**
- `POST /api/stripe/create-portal-session`: Creates Stripe Customer Portal session
- `GET /api/stripe/subscription/:userId`: Retrieves subscription status (includes `past_due` status)

#### **Frontend Components:**
- `SettingsModal.jsx`: Displays subscription status and payment failure warnings
- `App.jsx`: Handles Customer Portal return redirects

#### **Stripe Customer Portal:**
- Secure, hosted payment management interface
- Allows customers to:
  - Update payment methods
  - View invoices
  - Manage subscription
  - Update billing information

## Summary

**When payment fails after 7-day trial:**
1. Stripe automatically retries 3 times
2. Subscription becomes `past_due`
3. Customer sees warning in Settings
4. Customer clicks "Update Payment Method"
5. Stripe Customer Portal opens
6. Customer updates payment method
7. Stripe retries charge automatically
8. Subscription reactivates to `active` status

**Key Takeaway:** The system handles payment failures gracefully with automatic retries and provides clear UI for customers to resolve payment issues without losing access permanently.

