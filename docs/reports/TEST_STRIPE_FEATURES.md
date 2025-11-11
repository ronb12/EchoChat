# Testing Send Money & Request Money Features

## Quick Start Guide

### Option 1: Test via Backend API (Recommended)

**1. Start the backend server:**
```bash
npm run server:dev
```

**2. In another terminal, test the API:**
```bash
node server/test-stripe.js
```

This will test:
- ✅ Create Connected Account
- ✅ Create Payment Intent (Send Money)
- ✅ Create Payment Request (Request Money)

### Option 2: Test with Stripe CLI

**1. Install Stripe CLI:**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

**2. Login to Stripe:**
```bash
stripe login
```

**3. Run the test script:**
```bash
./test-stripe-direct.sh
```

## Manual Testing Steps

### Test 1: Send Money

#### Via Backend API:
```bash
# Create account first
curl -X POST http://localhost:3001/api/stripe/create-account \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "email": "test@example.com",
    "country": "US"
  }'

# Create payment intent
curl -X POST http://localhost:3001/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "recipientAccountId": "acct_xxxxx",
    "metadata": {
      "senderId": "user123",
      "note": "Test payment"
    }
  }'
```

#### Via Stripe CLI:
```bash
# Create connected account
stripe connect accounts create \
  --type=express \
  --email=test@example.com \
  --country=US

# Create payment intent
stripe payment_intents create \
  --amount=2500 \
  --currency=usd \
  --payment_method=pm_card_visa \
  --on_behalf_of=acct_xxxxx \
  --transfer_data[destination]=acct_xxxxx
```

### Test 2: Request Money

#### Via Backend API:
```bash
curl -X POST http://localhost:3001/api/stripe/create-payment-request \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "description": "Money request",
    "recipientAccountId": "acct_xxxxx",
    "metadata": {
      "requestorId": "user123"
    }
  }'
```

#### Via Stripe CLI:
```bash
# Create product
stripe products create \
  --name="Money Request" \
  --description="Payment request for $50.00"

# Create price
stripe prices create \
  --product=prod_xxxxx \
  --unit_amount=5000 \
  --currency=usd

# Create payment link
stripe payment_links create \
  --line_items[0][price]=price_xxxxx \
  --line_items[0][quantity]=1
```

## Testing with Webhooks

**1. Start the server:**
```bash
npm run server:dev
```

**2. Forward webhooks (in another terminal):**
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

**3. Trigger test events:**
```bash
# Trigger payment intent succeeded
stripe trigger payment_intent.succeeded

# Trigger transfer created
stripe trigger transfer.created
```

## Test Scenarios

### Scenario 1: Send $25 to a friend

1. **Create sender account:**
   ```bash
   curl -X POST http://localhost:3001/api/stripe/create-account \
     -H "Content-Type: application/json" \
     -d '{"userId":"sender123","email":"sender@test.com","country":"US"}'
   ```
   Save the `accountId` from response.

2. **Create recipient account:**
   ```bash
   curl -X POST http://localhost:3001/api/stripe/create-account \
     -H "Content-Type: application/json" \
     -d '{"userId":"recipient456","email":"recipient@test.com","country":"US"}'
   ```
   Save the `accountId` from response.

3. **Create payment intent:**
   ```bash
   curl -X POST http://localhost:3001/api/stripe/create-payment-intent \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 25.00,
       "recipientAccountId": "acct_recipient_id",
       "metadata": {
         "senderId": "sender123",
         "recipientId": "recipient456",
         "note": "Lunch money"
       }
     }'
   ```

4. **Confirm payment (use test card):**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

### Scenario 2: Request $50 from a friend

1. **Create requestor account** (same as above)

2. **Create payment request:**
   ```bash
   curl -X POST http://localhost:3001/api/stripe/create-payment-request \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 50.00,
       "description": "Dinner reimbursement",
       "recipientAccountId": "acct_requestor_id",
       "metadata": {
         "requestorId": "requestor123",
         "note": "Split dinner bill"
       }
     }'
   ```

3. **Share the payment link** from response
4. **Payer completes payment** via the link

## Expected Results

### Send Money Success:
- Payment intent created with status `requires_payment_method`
- Client secret generated for frontend confirmation
- Transfer destination set to recipient account
- Fee calculated: 2.9% + $0.30

### Request Money Success:
- Product created
- Price created for amount
- Payment link generated
- Link can be shared and used for payment

## Troubleshooting

### Server not running:
```bash
npm run server:dev
```

### CORS errors:
- Check `CORS_ORIGIN` in server/.env matches frontend URL
- Default: `http://localhost:3000`

### Stripe API errors:
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check account is in test mode (sk_test_*)
- Ensure account has correct permissions

### Webhook errors:
- Make sure webhook secret is configured
- Use `stripe listen` for development
- Check server logs for errors

## Test Cards

Use these test card numbers:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`

## View Results

**Stripe Dashboard:**
- Visit: https://dashboard.stripe.com/test
- Check: Payments, Connect, Balance Transactions

**Backend Logs:**
- Check server terminal for API calls
- Check webhook handler for events

**API Response:**
- Payment intent includes `clientSecret`
- Payment request includes `paymentLink`
- All responses include IDs for tracking

## Next Steps After Testing

1. ✅ Verify payment intents appear in Stripe Dashboard
2. ✅ Verify payment links work and can receive payments
3. ✅ Check webhook events are received
4. ✅ Test with different amounts
5. ✅ Test error scenarios (declined cards, etc.)
6. ✅ Integrate with frontend SendMoneyModal



