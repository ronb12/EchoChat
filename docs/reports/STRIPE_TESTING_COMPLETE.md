# ✅ Stripe Backend Testing Guide

## Implementation Status

✅ **Backend Server:** Fully implemented in `server/server.js`
✅ **Test Script:** Available in `server/test-stripe.js`
✅ **API Endpoints:** All endpoints ready for testing
✅ **Documentation:** Complete guides available

## Quick Test Instructions

### Step 1: Configure Environment

Create `server/.env` file:
```env
PORT=3001
STRIPE_SECRET_KEY=sk_test_your_key_here
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

Or set environment variable:
```bash
export STRIPE_SECRET_KEY="sk_test_your_key_here"
```

### Step 2: Start Server

```bash
# Option A: Development mode (auto-reload)
npm run server:dev

# Option B: Direct
cd server && node server.js
```

### Step 3: Test Endpoints

**Run automated test:**
```bash
node server/test-stripe.js
```

**Or test manually with curl:**

**Send Money:**
```bash
# 1. Create account
curl -X POST http://localhost:3001/api/stripe/create-account \
  -H "Content-Type: application/json" \
  -d '{"userId":"test1","email":"test@example.com","country":"US"}'

# 2. Send money (use accountId from step 1)
curl -X POST http://localhost:3001/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "recipientAccountId": "acct_xxxxx",
    "metadata": {"senderId": "test1"}
  }'
```

**Request Money:**
```bash
curl -X POST http://localhost:3001/api/stripe/create-payment-request \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "description": "Test request",
    "recipientAccountId": "acct_xxxxx"
  }'
```

## Testing with Stripe CLI

### Install Stripe CLI (if needed):
```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### Start Webhook Listener:
```bash
# Terminal 1: Server (already running)
# Terminal 2: Webhook forwarder
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### Test Send Money via CLI:
```bash
# Create account
stripe connect accounts create \
  --type=express \
  --email=test@example.com \
  --country=US

# Create payment intent (use account ID from above)
stripe payment_intents create \
  --amount=2500 \
  --currency=usd \
  --payment_method=pm_card_visa \
  --on_behalf_of=acct_xxxxx \
  --transfer_data[destination]=acct_xxxxx
```

### Test Request Money via CLI:
```bash
# Create product
PRODUCT=$(stripe products create --name="Request $50")
PROD_ID=$(echo "$PRODUCT" | grep -o "prod_[a-zA-Z0-9]*")

# Create price
PRICE=$(stripe prices create --product=$PROD_ID --unit_amount=5000 --currency=usd)
PRICE_ID=$(echo "$PRICE" | grep -o "price_[a-zA-Z0-9]*")

# Create payment link
stripe payment_links create \
  --line_items[0][price]=$PRICE_ID \
  --line_items[0][quantity]=1
```

## Expected Test Results

### ✅ Send Money Success:
- Payment intent ID returned
- Client secret for frontend
- Amount: $25.00
- Fee calculated: ~$1.03 (2.9% + $0.30)
- Transfer destination set

### ✅ Request Money Success:
- Product ID created
- Price ID created ($50.00)
- Payment link generated
- Link URL shareable

## View Results

1. **Stripe Dashboard:** https://dashboard.stripe.com/test
   - Check Payments → Payment Intents
   - Check Payments → Payment Links
   - Check Connect → Accounts
   - Check Balance → Transactions

2. **Server Logs:** Check terminal running server

3. **Webhook Logs:** Check Stripe CLI output

## Files Created

- ✅ `server/server.js` - Backend API server
- ✅ `server/test-stripe.js` - Automated test script
- ✅ `server/README.md` - Server documentation
- ✅ `BACKEND_SETUP.md` - Complete setup guide
- ✅ `STRIPE_CLI_TEST_GUIDE.md` - CLI testing guide
- ✅ `QUICK_STRIPE_TEST.md` - Quick reference
- ✅ `TEST_STRIPE_FEATURES.md` - Feature testing guide

## Next Steps

1. ✅ Add your Stripe test key to `server/.env`
2. ✅ Start server: `npm run server:dev`
3. ✅ Run tests: `node server/test-stripe.js`
4. ✅ Test with Stripe CLI (optional)
5. ✅ Verify in Stripe Dashboard
6. ✅ Integrate with frontend SendMoneyModal

---

**Ready to test!** Just add your Stripe test key and run the server.



