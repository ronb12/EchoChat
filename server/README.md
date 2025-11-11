# EchoChat Backend Server

Production-ready backend API server for Stripe payment integration in EchoChat, optimized with Vite.

## Features

- ✅ Vite-based build system for production optimization
- ✅ Environment variable handling (supports both VITE_ and standard prefixes)
- ✅ Production-ready CORS configuration
- ✅ Stripe integration with Connect, Subscriptions, and Webhooks
- ✅ Automatic environment detection (development/production)
- ✅ Comprehensive error handling and logging

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

Or from root:
```bash
npm run server:install
```

### 2. Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Stripe Configuration (TEST mode for development)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
VITE_STRIPE_SECRET_KEY=sk_test_your_secret_key_here  # Alternative for Vite compatibility

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
FRONTEND_URL=http://localhost:3000

# Stripe Webhooks (Development)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Production Environment Variables

For production, use `.env.production`:

```env
NODE_ENV=production
PORT=3001

# Stripe LIVE Keys (Required for production)
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
VITE_STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here

# Production CORS
CORS_ORIGIN=https://echochat-messaging.web.app,https://echochat-messaging.firebaseapp.com
FRONTEND_URL=https://echochat-messaging.web.app

# Production Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
```

## Running the Server

### Development Mode

```bash
# From server directory
npm run dev

# Or from root directory
npm run server:dev
```

This runs with `nodemon` for auto-reload on file changes.

### Production Build

```bash
# Build optimized production bundle
npm run build:prod

# Start production server
npm run start:prod

# Or from root
npm run server:build:prod
npm run server:start:prod
```

### Quick Start (Development)

```bash
# From root directory
npm run server
```

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Stripe Connect
- **POST** `/api/stripe/create-account` - Create connected account
- **GET** `/api/stripe/account-status/:userId` - Get account status
- **POST** `/api/stripe/create-account-link` - Create onboarding link

### Payments
- **POST** `/api/stripe/create-payment-intent` - Create payment intent
- **POST** `/api/stripe/confirm-payment` - Confirm payment
- **POST** `/api/stripe/transfer` - Transfer money to connected account

### Subscriptions
- **POST** `/api/stripe/create-checkout-session` - Create subscription checkout
- **GET** `/api/stripe/subscription/:userId` - Get subscription status
- **POST** `/api/stripe/create-portal-session` - Create customer portal session

### Request Money
- **POST** `/api/stripe/create-payment-request` - Create payment link

### Cashout
- **GET** `/api/stripe/balance/:accountId` - Get account balance
- **POST** `/api/stripe/create-payout` - Create payout

### Transactions
- **GET** `/api/stripe/transactions/:userId` - Get transaction history

### Webhooks
- **POST** `/api/stripe/webhook` - Stripe webhook handler

## Vite Integration

The backend uses Vite for:
- Environment variable processing
- Production build optimization
- Development hot-reload support

### Environment Variables

The server supports both standard and VITE_ prefixed variables:
- `STRIPE_SECRET_KEY` or `VITE_STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY` or `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL` (for frontend compatibility)

### Build Process

```bash
# Development build (with sourcemaps)
npm run build

# Production build (minified, optimized)
npm run build:prod
```

The build creates an optimized `dist/server.js` file ready for production deployment.

## Testing

### With Stripe CLI

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Forward webhooks:**
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

3. **Test endpoints:**
   ```bash
   # Health check
   curl http://localhost:3001/health
   ```

## Production Deployment

### Railway / Render / Heroku

1. **Set environment variables** on your hosting platform:
   - `NODE_ENV=production`
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `CORS_ORIGIN=https://echochat-messaging.web.app`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`

2. **Deploy:**
   ```bash
   git push heroku main  # Heroku
   # Or use your platform's deployment method
   ```

3. **Build command** (if needed):
   ```bash
   npm run build:prod
   ```

4. **Start command:**
   ```bash
   npm run start:prod
   ```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:prod
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

## Security

- ✅ CORS restricted in production mode
- ✅ Environment variable validation
- ✅ Stripe key validation (warns if test keys in production)
- ✅ Webhook signature verification
- ✅ Error messages don't expose sensitive data

## Troubleshooting

### Environment Variables Not Loading

1. Check `.env` file exists in `server/` directory
2. Verify variable names match (case-sensitive)
3. Restart server after changing `.env`

### CORS Errors

1. Ensure `CORS_ORIGIN` includes your frontend URL
2. Check `NODE_ENV=production` is set in production
3. Verify backend allows your domain

### Stripe Errors

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check key is LIVE in production (not TEST)
3. Ensure webhook secret matches Stripe Dashboard

## License

MIT
