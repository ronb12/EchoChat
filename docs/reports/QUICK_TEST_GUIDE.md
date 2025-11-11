# Quick Test Guide - Money Features

## ✅ All Features Implemented

1. **Request Money** - Create payment links
2. **Send Money** - Send payments via payment intents
3. **Cashout Money** - Withdraw to bank/card

## Quick Test (Without Stripe Key)

**Test API Structure:**
```bash
./test-money-features-simple.sh
```

This confirms all endpoints are implemented and responding correctly.

## Full Test (With Stripe Key)

### 1. Setup

```bash
# Add your Stripe test key
echo "STRIPE_SECRET_KEY=sk_test_your_key" > server/.env
echo "PORT=3001" >> server/.env
```

### 2. Start Server

```bash
npm run server:dev
```

### 3. Run Tests

```bash
node test-all-money-features.js
```

This will test:
- ✅ Create accounts
- ✅ Send money (payment intent)
- ✅ Request money (payment link)
- ✅ Get balance
- ✅ Get external accounts
- ✅ Cashout (payout)
- ✅ Payout history

## Manual Testing

### Test Send Money:
```bash
curl -X POST http://localhost:3001/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount":25.00,"recipientAccountId":"acct_xxxxx"}'
```

### Test Request Money:
```bash
curl -X POST http://localhost:3001/api/stripe/create-payment-request \
  -H "Content-Type: application/json" \
  -d '{"amount":50.00,"recipientAccountId":"acct_xxxxx","description":"Test"}'
```

### Test Cashout:
```bash
# Get balance
curl http://localhost:3001/api/stripe/balance/acct_xxxxx

# Create payout
curl -X POST http://localhost:3001/api/stripe/create-payout \
  -H "Content-Type: application/json" \
  -d '{"accountId":"acct_xxxxx","amount":10.00,"destination":"ba_xxxxx"}'
```

## Frontend Testing

1. **Start frontend:** `npm run dev`
2. **Start backend:** `npm run server:dev` (in another terminal)
3. **Test in browser:**
   - Send Money: Click 💵 button
   - Request Money: 3 dots menu → Send Money
   - Cashout: Settings → Cash Out

---

**Status:** ✅ Ready to test with real Stripe key!



