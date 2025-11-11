# Quick Stripe Testing Guide

## ✅ Backend is Ready for Testing

The Stripe backend has been implemented. Here's how to test it:

## Method 1: Quick API Test (No Stripe CLI Needed)

### 1. Set Environment Variable

Create `server/.env` or set in terminal:
```bash
export STRIPE_SECRET_KEY="sk_test_your_key_here"
export PORT=3001
export CORS_ORIGIN="http://localhost:3000"
```

### 2. Start Server

```bash
npm run server:dev
```

Or:
```bash
cd server && STRIPE_SECRET_KEY="sk_test_mock" node server.js
```

### 3. Test Endpoints

**Test Send Money:**
```bash
# Create account
curl -X POST http://localhost:3001/api/stripe/create-account \
  -H "Content-Type: application/json" \
  -d '{"userId":"test1","email":"sender@test.com","country":"US"}'

# Create payment intent (save accountId from above)
curl -X POST http://localhost:3001/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "recipientAccountId": "acct_xxxxx",
    "metadata": {"senderId": "test1"}
  }'
```

**Test Request Money:**
```bash
curl -X POST http://localhost:3001/api/stripe/create-payment-request \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "description": "Test request",
    "recipientAccountId": "acct_xxxxx"
  }'
```

## Method 2: With Stripe CLI

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### 2. Login

```bash
stripe login
```

### 3. Start Server & Webhook Listener

**Terminal 1 - Server:**
```bash
npm run server:dev
```

**Terminal 2 - Webhooks:**
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### 4. Test Send Money

```bash
# Create account via CLI
ACCOUNT=$(stripe connect accounts create --type=express --email=test@example.com --country=US)
ACCOUNT_ID=$(echo "$ACCOUNT" | grep -o "acct_[a-zA-Z0-9]*")

# Create payment intent
stripe payment_intents create \
  --amount=2500 \
  --currency=usd \
  --payment_method=pm_card_visa \
  --on_behalf_of=$ACCOUNT_ID \
  --transfer_data[destination]=$ACCOUNT_ID
```

### 5. Test Request Money

```bash
# Create product
PRODUCT=$(stripe products create --name="Money Request")
PROD_ID=$(echo "$PRODUCT" | grep -o "prod_[a-zA-Z0-9]*")

# Create price
PRICE=$(stripe prices create --product=$PROD_ID --unit_amount=5000 --currency=usd)
PRICE_ID=$(echo "$PRICE" | grep -o "price_[a-zA-Z0-9]*")

# Create payment link
stripe payment_links create \
  --line_items[0][price]=$PRICE_ID \
  --line_items[0][quantity]=1
```

## Expected Results

### Send Money Success:
- ✅ Payment intent created
- ✅ `clientSecret` returned for frontend
- ✅ Status: `requires_payment_method`
- ✅ Transfer destination set

### Request Money Success:
- ✅ Product created
- ✅ Price created ($50.00)
- ✅ Payment link generated
- ✅ Link can be shared

## View in Stripe Dashboard

1. Visit: https://dashboard.stripe.com/test
2. Check:
   - **Connect** → Accounts (for connected accounts)
   - **Payments** → Payment Intents
   - **Payments** → Payment Links
   - **Balance** → Transactions

## Troubleshooting

**Server won't start:**
- Check `STRIPE_SECRET_KEY` is set
- Verify port 3001 is available
- Check server logs

**API errors:**
- Verify Stripe key is valid
- Check account is in test mode
- Ensure correct permissions

**No Stripe CLI:**
- Use API method instead
- Or install: `brew install stripe/stripe-cli/stripe`

## Next Steps

1. ✅ Test endpoints work
2. ✅ Verify responses include IDs
3. ✅ Check Stripe Dashboard
4. ✅ Test with webhooks
5. ✅ Integrate with frontend

All code is ready - just need to add your Stripe test key!



