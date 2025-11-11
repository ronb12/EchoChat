# Stripe CLI Testing Guide for EchoChat

This guide shows how to test Stripe money sending and requesting features using the Stripe CLI.

## Account Information
- **Stripe Account:** ronellbradley@bradleyvs.com
- **Test Mode:** Use test API keys (pk_test_* and sk_test_*)

## Prerequisites

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Set your test API keys in `.env`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_STRIPE_SECRET_KEY=sk_test_...
   ```

## Test Commands

### 1. Create a Connected Account (Express)

```bash
stripe connect accounts create \
  --type=express \
  --email=test@example.com \
  --country=US \
  --capabilities[card_payments][requested]=true \
  --capabilities[transfers][requested]=true
```

**Response:** Returns an account ID like `acct_xxxxx`

### 2. Create Payment Intent (Send Money)

```bash
stripe payment_intents create \
  --amount=2500 \
  --currency=usd \
  --payment_method=pm_card_visa \
  --confirm=true \
  --on_behalf_of=acct_recipient_account_id \
  --transfer_data[destination]=acct_recipient_account_id
```

**Notes:**
- Amount is in cents (2500 = $25.00)
- `pm_card_visa` is a test card
- `acct_recipient_account_id` is the connected account receiving the money

### 3. Transfer to Connected Account

```bash
stripe transfers create \
  --amount=2500 \
  --currency=usd \
  --destination=acct_recipient_account_id \
  --source_transaction=ch_xxxxx
```

### 4. Create Payment Request Link (Request Money)

```bash
# First, create a product
stripe products create \
  --name="Money Request" \
  --description="Payment request from EchoChat"

# Then create a price
stripe prices create \
  --product=prod_xxxxx \
  --unit_amount=5000 \
  --currency=usd

# Create payment link
stripe payment_links create \
  --line_items[0][price]=price_xxxxx \
  --line_items[0][quantity]=1 \
  --after_completion[type]=redirect \
  --after_completion[redirect][url]=https://echochat.app/payment-success
```

### 5. View Account Balance

```bash
stripe balance retrieve
```

### 6. List Transactions

```bash
stripe balance_transactions list \
  --limit=10
```

### 7. Test Card Payments

Use these test card numbers:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`

Expiry: Any future date (e.g., `12/34`)
CVC: Any 3 digits (e.g., `123`)

## Testing Flow

### Send Money Test

1. **Create sender account:**
   ```bash
   stripe connect accounts create --type=express --email=sender@test.com --country=US
   ```
   Save the account ID: `acct_sender_xxxxx`

2. **Create recipient account:**
   ```bash
   stripe connect accounts create --type=express --email=recipient@test.com --country=US
   ```
   Save the account ID: `acct_recipient_xxxxx`

3. **Create payment intent:**
   ```bash
   stripe payment_intents create \
     --amount=2500 \
     --currency=usd \
     --payment_method=pm_card_visa \
     --on_behalf_of=acct_sender_xxxxx \
     --transfer_data[destination]=acct_recipient_xxxxx
   ```

4. **Confirm payment:**
   ```bash
   stripe payment_intents confirm pi_xxxxx \
     --payment_method=pm_card_visa
   ```

### Request Money Test

1. **Create product and price:**
   ```bash
   PRODUCT=$(stripe products create --name="Request $50" --description="Money request" -q)
   PRICE=$(stripe prices create --product=$PRODUCT --unit_amount=5000 --currency=usd -q)
   ```

2. **Create payment link:**
   ```bash
   stripe payment_links create \
     --line_items[0][price]=$PRICE \
     --line_items[0][quantity]=1
   ```

3. **Share the payment link** with the payer

## Run Test Script

```bash
node scripts/test-stripe-cli.js
```

This will run mock tests and show you the CLI commands to use.

## Monitor Events in Real-Time

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

This will forward Stripe webhook events to your local server.

## Useful Commands

```bash
# View account details
stripe accounts retrieve acct_xxxxx

# View payment intent
stripe payment_intents retrieve pi_xxxxx

# View transfer
stripe transfers retrieve tr_xxxxx

# List all connected accounts
stripe connect accounts list

# View events
stripe events list --limit=10
```

## Security Notes

⚠️ **NEVER commit your secret keys to version control**
- Use environment variables
- Secret keys (`sk_*`) must only be used on the backend
- Publishable keys (`pk_*`) can be used in frontend

## Next Steps

1. Set up webhook endpoints for real-time payment status updates
2. Implement Connect onboarding flow for new users
3. Add payment method management UI
4. Create transaction history view
5. Add dispute and refund handling

## Resources

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Test Cards](https://stripe.com/docs/testing#cards)
- [Webhook Events](https://stripe.com/docs/api/events/types)



