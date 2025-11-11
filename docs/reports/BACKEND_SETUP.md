# Backend Setup Guide for Stripe Integration

## ✅ Backend Implementation Complete

A complete Express.js backend server has been implemented with Stripe Connect integration.

## Quick Start

### 1. Install Backend Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `stripe` - Stripe SDK
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `nodemon` - Development server (dev dependency)

### 2. Configure Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Or add to root `.env`:
```env
VITE_API_BASE_URL=http://localhost:3001/api
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run server:dev
```

**Production mode:**
```bash
npm run server
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
- **GET** `/health` - Check if server is running

### Stripe Connect
- **POST** `/api/stripe/create-account`
  - Create a Stripe Connect Express account
  - Returns: `accountId`, `onboardingUrl`

- **GET** `/api/stripe/account-status/:userId`
  - Get account status for a user
  - Returns: Account details, capabilities, requirements

### Payments (Send Money)
- **POST** `/api/stripe/create-payment-intent`
  - Create payment intent for sending money
  - Body: `{ amount, recipientAccountId, metadata }`
  - Returns: `clientSecret`, `paymentIntentId`

- **POST** `/api/stripe/confirm-payment`
  - Confirm a payment intent
  - Body: `{ paymentIntentId, paymentMethodId }`

- **POST** `/api/stripe/transfer`
  - Direct transfer to connected account
  - Body: `{ amount, destination, metadata }`

### Request Money
- **POST** `/api/stripe/create-payment-request`
  - Create payment link for requesting money
  - Body: `{ amount, description, recipientAccountId }`
  - Returns: `paymentLink`, `paymentLinkId`

### Transactions
- **GET** `/api/stripe/transactions/:userId`
  - Get transaction history for a user
  - Query: `?limit=10`

### Webhooks
- **POST** `/api/stripe/webhook`
  - Stripe webhook endpoint
  - Handles: `payment_intent.succeeded`, `transfer.created`, `account.updated`

## Testing

### 1. Test Backend API

```bash
node server/test-stripe.js
```

This will test all endpoints (requires server to be running).

### 2. Test with Stripe CLI

**Start server:**
```bash
npm run server
```

**Forward webhooks:**
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

**Test create account:**
```bash
curl -X POST http://localhost:3001/api/stripe/create-account \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","email":"test@example.com","country":"US"}'
```

**Test payment intent:**
```bash
curl -X POST http://localhost:3001/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "recipientAccountId": "acct_xxxxx",
    "metadata": {"senderId": "user123"}
  }'
```

### 3. Test with Stripe CLI Commands

```bash
# Create connected account via CLI
stripe connect accounts create \
  --type=express \
  --email=test@example.com \
  --country=US

# Create payment intent via CLI
stripe payment_intents create \
  --amount=2500 \
  --currency=usd \
  --payment_method=pm_card_visa \
  --on_behalf_of=acct_xxxxx \
  --transfer_data[destination]=acct_xxxxx
```

## Integration with Frontend

Update `src/services/paymentService.js` to use the backend API:

```javascript
this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

The frontend will automatically use the backend endpoints when configured.

## Server Structure

```
server/
├── server.js          # Main Express server
├── package.json       # Server dependencies
├── .env.example       # Environment variables template
├── test-stripe.js     # API test script
└── README.md          # Server documentation
```

## Security Checklist

- [x] CORS configured
- [x] Environment variables for secrets
- [x] Webhook signature verification
- [x] Input validation
- [ ] Rate limiting (add for production)
- [ ] Authentication middleware (add for production)
- [ ] HTTPS (required for production)

## Production Deployment

1. **Set environment variables** on your hosting platform
2. **Use HTTPS** - Stripe requires HTTPS for production
3. **Configure webhooks** in Stripe Dashboard
4. **Enable rate limiting** to prevent abuse
5. **Add authentication** to protect endpoints
6. **Monitor logs** for errors and suspicious activity

## Troubleshooting

### Server won't start
- Check if port 3001 is available
- Verify `STRIPE_SECRET_KEY` is set
- Check for syntax errors in `server.js`

### CORS errors
- Verify `CORS_ORIGIN` matches your frontend URL
- Check browser console for specific error

### Webhook errors
- Verify `STRIPE_WEBHOOK_SECRET` is set
- Use `stripe listen` to forward webhooks during development
- Check webhook signature in Stripe Dashboard

### Payment failures
- Verify account IDs are correct
- Check Stripe Dashboard for error details
- Ensure accounts are fully onboarded

## Next Steps

1. **Add authentication** - Protect endpoints with JWT or Firebase Auth
2. **Database integration** - Store transactions in Firestore
3. **Error handling** - Better error messages and logging
4. **Rate limiting** - Prevent API abuse
5. **Webhook processing** - Update database on webhook events
6. **Testing** - Add unit and integration tests

## Support

For issues or questions:
- Check `server/README.md` for detailed API documentation
- Review Stripe documentation: https://stripe.com/docs
- Check server logs for error messages



