/**
 * EchoDynamo Backend Server - Stripe Integration
 * Handles Stripe Connect payments, money transfers, and webhooks
 * 
 * Run with: node server/server.js
 * Or: npm run server
 */

// Load environment variables from root .env or server/.env
const path = require('path');
const fs = require('fs');
const bufferModule = require('buffer');

// Try to load from server/.env first, then root .env
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else {
  require('dotenv').config(); // Try default location
}

global.Buffer = bufferModule.Buffer;

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set. Stripe features will not work.');
  console.warn('   Set STRIPE_SECRET_KEY=sk_test_... to enable Stripe features.');
}

const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
}) : null;

// Middleware
// CORS configuration - allow multiple origins including Firebase hosting
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:5173',
  'https://echochat-messaging.web.app',
  'https://echochat-messaging.firebaseapp.com',
  'https://echodynamo.vercel.app',
  'https://echodynamo.web.app',
].join(',');
const allowedOrigins = (process.env.CORS_ORIGIN || defaultOrigins).split(',');
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Check if origin is in allowed list or if it's a Firebase hosting domain
    if (allowedOrigins.indexOf(origin) !== -1 || 
        allowedOrigins.includes('*') ||
        origin.includes('echochat-messaging.web.app') ||
        origin.includes('echochat-messaging.firebaseapp.com') ||
        origin.includes('echodynamo.vercel.app') ||
        origin.includes('echodynamo.web.app') ||
        origin.includes('localhost')) {
      callback(null, true);
    } else {
      // Allow all for development (but log it)
      console.log(`⚠️  CORS: Allowing origin ${origin} (not in allowed list)`);
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== Stripe Connect Account Routes ====================

/**
 * Create a Stripe Connect Express account
 * POST /api/stripe/create-account
 */
app.post('/api/stripe/create-account', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    const { userId, email, country = 'US' } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

    // Check if this is a business account (requires subscription)
    const isBusinessAccount = req.body.accountType === 'business' || 
                             req.body.isBusinessAccount === true;

    // Create Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: userId,
        app: 'EchoDynamo',
        accountType: isBusinessAccount ? 'business' : 'personal'
      }
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/stripe/return`,
      type: 'account_onboarding',
    });

    // If business account, create Stripe Checkout session to collect payment method upfront
    // Industry standard: Collect payment method before trial starts for automatic charging
    let checkoutSession = null;
    if (isBusinessAccount) {
      try {
        // Create or get customer
        let customer;
        const customers = await stripe.customers.list({
          email: email,
          limit: 1
        });

        if (customers.data.length > 0) {
          customer = customers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: email,
            metadata: {
              userId: userId,
              app: 'EchoDynamo'
            }
          });
        }

        // Get or create price ID
        let priceId = process.env.STRIPE_BUSINESS_PRICE_ID;
        
        if (!priceId) {
          const product = await stripe.products.create({
            name: 'EchoDynamo Business Plan',
            description: 'Monthly subscription for business accounts'
          });

          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: 3000, // $30.00
            currency: 'usd',
            recurring: {
              interval: 'month'
            }
          });

          priceId = price.id;
        }

        // Create Stripe Checkout session to collect payment method upfront
        // Payment method is collected but NOT charged - trial starts immediately
        // Customer is charged at the END of 7-day trial automatically
        checkoutSession = await stripe.checkout.sessions.create({
          customer: customer.id,
          payment_method_types: ['card'],
          line_items: [
            {
              price: priceId,
              quantity: 1
            }
          ],
          mode: 'subscription',
          subscription_data: {
            trial_period_days: 7,
            metadata: {
              userId: userId,
              accountType: 'business',
              app: 'EchoDynamo',
              stripeAccountId: account.id
            }
          },
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?session_id={CHECKOUT_SESSION_ID}&checkout_status=success&account_id=${account.id}`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?checkout_status=cancel&account_id=${account.id}`,
          metadata: {
            userId: userId,
            accountId: account.id,
            accountType: 'business'
          },
          allow_promotion_codes: true
        });
        
        console.log(`✅ Business checkout session created: ${checkoutSession.id}`);
        console.log(`   Customer must complete checkout to start 7-day free trial`);
        console.log(`   Payment method will be collected but NOT charged during trial`);
        console.log(`   Customer will be charged $30 at the END of 7-day trial`);
      } catch (checkoutError) {
        console.error('Error creating checkout session:', checkoutError);
        console.error('Checkout error details:', checkoutError.message);
        // Don't fail account creation if checkout fails, but log the error
        checkoutSession = null;
      }
    }

    res.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      // For business accounts, return checkout URL instead of subscription
      checkoutUrl: checkoutSession ? checkoutSession.url : null,
      checkoutSessionId: checkoutSession ? checkoutSession.id : null,
      requiresCheckout: isBusinessAccount, // Frontend should redirect to checkout
      message: isBusinessAccount && checkoutSession 
        ? 'Please complete checkout to start your 7-day free trial. Payment method will be saved but not charged until trial ends.'
        : null
    });
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create Stripe account' 
    });
  }
});

/**
 * Get account status
 * GET /api/stripe/account-status/:userId
 */
app.get('/api/stripe/account-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if this is a test business account
    const isTestBusiness = userId === 'test-business-1' || 
                          userId === 'business@echochat.com' ||
                          userId.includes('test-business');
    
    if (isTestBusiness) {
      // Return test account ID for test business account
      return res.json({
        accountId: 'test-business-1',
        chargesEnabled: true,
        payoutsEnabled: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: []
        },
        email: 'business@echochat.com',
        country: 'us'
      });
    }
    
    // In production, look up accountId from database
    // For now, return mock data or search accounts by metadata
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }
    
    const accounts = await stripe.accounts.list({
      limit: 100,
    });

    const userAccount = accounts.data.find(
      acc => acc.metadata?.userId === userId
    );

    if (!userAccount) {
      return res.status(404).json({ 
        error: 'Account not found' 
      });
    }

    res.json({
      accountId: userAccount.id,
      chargesEnabled: userAccount.charges_enabled,
      payoutsEnabled: userAccount.payouts_enabled,
      requirements: userAccount.requirements,
      email: userAccount.email,
      country: userAccount.country
    });
  } catch (error) {
    console.error('Error getting account status:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get account status' 
    });
  }
});

// ==================== Payment Routes ====================

/**
 * Create payment intent for sending money
 * POST /api/stripe/create-payment-intent
 */
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    const { amount, recipientAccountId, metadata = {} } = req.body;

    if (!amount || !recipientAccountId) {
      return res.status(400).json({ 
        error: 'amount and recipientAccountId are required' 
      });
    }

    // Validate amount (in dollars, convert to cents)
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (amountInCents < 100) {
      return res.status(400).json({ 
        error: 'Minimum amount is $1.00' 
      });
    }

    // Check if recipient account has transfers enabled
    let transfersEnabled = false;
    let accountReady = false;
    try {
      const account = await stripe.accounts.retrieve(recipientAccountId);
      transfersEnabled = account.capabilities?.transfers === 'active';
      accountReady = account.charges_enabled && (transfersEnabled || account.capabilities?.transfers === 'pending');
    } catch (accountError) {
      console.warn('Could not retrieve account:', accountError.message);
    }

    // Build payment intent options
    const paymentIntentOptions = {
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        ...metadata,
        type: 'send_money',
        created_at: new Date().toISOString(),
        recipientAccountId: recipientAccountId
      },
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Only add transfer_data if account has transfers enabled
    // For test accounts that aren't fully onboarded, create payment intent without transfer
    // The transfer can be done separately after payment is confirmed
    if (transfersEnabled) {
      paymentIntentOptions.application_fee_amount = Math.round(amountInCents * 0.029 + 30); // 2.9% + $0.30
      paymentIntentOptions.transfer_data = {
        destination: recipientAccountId,
      };
    } else {
      // For accounts without transfers enabled, store the recipient in metadata
      // The frontend can handle the transfer separately after payment confirmation
      paymentIntentOptions.metadata.needsTransfer = 'true';
      paymentIntentOptions.metadata.recipientAccountId = recipientAccountId;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
      transfersEnabled: transfersEnabled,
      accountReady: accountReady,
      needsTransfer: !transfersEnabled,
      message: transfersEnabled 
        ? 'Payment intent created with direct transfer' 
        : 'Payment intent created. Transfer will be completed after account onboarding.'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment intent' 
    });
  }
});

/**
 * Confirm payment intent
 * POST /api/stripe/confirm-payment
 */
app.post('/api/stripe/confirm-payment', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY'
      });
    }

    const { paymentIntentId, paymentMethodId } = req.body;

    if (!paymentIntentId || !paymentMethodId) {
      return res.status(400).json({ 
        error: 'paymentIntentId and paymentMethodId are required' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentId,
      { payment_method: paymentMethodId }
    );

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to confirm payment' 
    });
  }
});

/**
 * Transfer money to connected account
 * POST /api/stripe/transfer
 */
app.post('/api/stripe/transfer', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    const { amount, destination, metadata = {} } = req.body;

    if (!amount || !destination) {
      return res.status(400).json({ 
        error: 'amount and destination are required' 
      });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: destination,
      metadata: {
        ...metadata,
        type: 'money_transfer',
        created_at: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      transferId: transfer.id,
      amount: transfer.amount / 100,
      status: transfer.status,
      destination: transfer.destination
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create transfer' 
    });
  }
});

// ==================== Request Money Routes ====================

/**
 * Create payment link for requesting money
 * POST /api/stripe/create-payment-request
 */
app.post('/api/stripe/create-payment-request', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    const { amount, description, recipientAccountId, metadata = {} } = req.body;

    if (!amount || !recipientAccountId) {
      return res.status(400).json({ 
        error: 'amount and recipientAccountId are required' 
      });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Create product
    const product = await stripe.products.create({
      name: description || 'Money Request',
      description: `Payment request: $${(amountInCents / 100).toFixed(2)}`,
      metadata: {
        ...metadata,
        type: 'money_request',
        created_at: new Date().toISOString()
      }
    });

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountInCents,
      currency: 'usd',
    });

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
        },
      },
      metadata: {
        ...metadata,
        recipientAccountId,
        type: 'money_request'
      }
    });

    res.json({
      success: true,
      paymentLink: paymentLink.url,
      paymentLinkId: paymentLink.id,
      amount: amountInCents / 100,
      productId: product.id,
      priceId: price.id
    });
  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment request' 
    });
  }
});

// ==================== Cashout/Payout Routes ====================

/**
 * Get account balance
 * GET /api/stripe/balance/:accountId
 */
app.get('/api/stripe/balance/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // Check if this is a test business account (sample data)
    const isTestBusiness = accountId === 'test-business-1' || 
                          accountId === 'business@echochat.com' ||
                          accountId.includes('test-business') ||
                          accountId === 'test_account';

    if (isTestBusiness) {
      // Return sample balance data for test business account
      return res.json({
        available: 1250.75,
        pending: 342.50,
        currency: 'usd',
        breakdown: {
          available: [{
            amount: 1250.75,
            currency: 'usd',
            sourceTypes: { card: 850.25, bank_account: 400.50 }
          }],
          pending: [{
            amount: 342.50,
            currency: 'usd',
            sourceTypes: { card: 342.50 }
          }]
        }
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Get balance for connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId
    });

    // Calculate available balance (pending + available)
    const available = balance.available.reduce((sum, bal) => {
      return sum + bal.amount;
    }, 0);

    const pending = balance.pending.reduce((sum, bal) => {
      return sum + bal.amount;
    }, 0);

    res.json({
      available: available / 100, // Convert cents to dollars
      pending: pending / 100,
      currency: balance.available[0]?.currency || 'usd',
      breakdown: {
        available: balance.available.map(b => ({
          amount: b.amount / 100,
          currency: b.currency,
          sourceTypes: b.source_types
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount / 100,
          currency: b.currency,
          sourceTypes: b.source_types
        }))
      }
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get balance' 
    });
  }
});

/**
 * Get external accounts (bank accounts/cards) for cashout
 * GET /api/stripe/external-accounts/:accountId
 */
app.get('/api/stripe/external-accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Check if this is a test business account
    const isTestBusiness = accountId === 'test-business-1' || 
                          accountId === 'business@echochat.com' ||
                          accountId.includes('test-business') ||
                          accountId === 'test_account';

    if (isTestBusiness) {
      // Return sample external accounts for test business account
      return res.json({
        bankAccounts: [
          {
            id: 'ba_sample_001',
            bankName: 'Chase Bank',
            last4: '1234',
            accountHolderName: 'Test Business Account',
            accountHolderType: 'company',
            currency: 'usd',
            defaultForCurrency: true,
            status: 'verified',
            routingNumber: '****0210'
          }
        ],
        debitCards: [
          {
            id: 'card_sample_001',
            brand: 'visa',
            last4: '5678',
            expMonth: 12,
            expYear: 2025,
            defaultForCurrency: false,
            status: 'active'
          }
        ]
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Get bank accounts
    const bankAccounts = await stripe.accounts.listExternalAccounts(accountId, {
      object: 'bank_account',
      limit: 100
    });

    // Get cards (for instant payouts)
    const cards = await stripe.accounts.listExternalAccounts(accountId, {
      object: 'card',
      limit: 100
    });

    res.json({
      bankAccounts: bankAccounts.data.map(ba => ({
        id: ba.id,
        bankName: ba.bank_name,
        last4: ba.last4,
        accountHolderName: ba.account_holder_name,
        accountHolderType: ba.account_holder_type,
        currency: ba.currency,
        defaultForCurrency: ba.default_for_currency,
        status: ba.status,
        routingNumber: ba.routing_number ? `****${ba.routing_number.slice(-4)}` : null
      })),
      debitCards: cards.data.map(card => ({
        id: card.id,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        funding: card.funding,
        currency: card.currency,
        defaultForCurrency: card.default_for_currency
      }))
    });
  } catch (error) {
    console.error('Error getting external accounts:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get external accounts' 
    });
  }
});

/**
 * Create account link for adding external account (bank/card)
 * POST /api/stripe/create-account-link
 */
app.post('/api/stripe/create-account-link', async (req, res) => {
  try {
    const { accountId, type = 'account_onboarding' } = req.body;

    if (!accountId) {
      return res.status(400).json({ 
        error: 'accountId is required' 
      });
    }

    // Check if this is a test business account
    const isTestBusiness = accountId === 'test-business-1' || 
                          accountId === 'business@echochat.com' ||
                          accountId.includes('test-business') ||
                          accountId === 'test_account';

    if (isTestBusiness) {
      // For test account, return a message that this is a demo
      return res.json({
        success: true,
        url: null,
        message: 'This is a test account. Real Stripe Connect account management is available for production accounts.',
        isTestAccount: true
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Create account link for adding payout methods
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/stripe/payout-return`,
      type: type, // 'account_onboarding' or 'account_update'
      collect: type === 'account_update' ? 'currently_due' : undefined
    });

    res.json({
      success: true,
      url: accountLink.url,
      expiresAt: accountLink.expires_at
    });
  } catch (error) {
    console.error('Error creating account link:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create account link' 
    });
  }
});

/**
 * Create payout (cashout) to external account
 * POST /api/stripe/create-payout
 */
app.post('/api/stripe/create-payout', async (req, res) => {
  try {
    const { accountId, amount, destination, instant = false, metadata = {} } = req.body;

    if (!accountId || !amount) {
      return res.status(400).json({ 
        error: 'accountId and amount are required' 
      });
    }

    // Validate amount
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (amountInCents < 50) {
      return res.status(400).json({ 
        error: 'Minimum payout amount is $0.50' 
      });
    }

    // Check balance first
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId
    });
    
    const available = balance.available.reduce((sum, bal) => sum + bal.amount, 0);
    if (amountInCents > available) {
      return res.status(400).json({ 
        error: `Insufficient balance. Available: $${(available / 100).toFixed(2)}` 
      });
    }

    // Create payout
    const payout = await stripe.payouts.create({
      amount: amountInCents,
      currency: 'usd',
      destination: destination, // External account ID (bank account or card)
      method: instant ? 'instant' : 'standard', // instant for debit cards, standard for bank accounts
      metadata: {
        ...metadata,
        type: 'cashout',
        created_at: new Date().toISOString()
      }
    }, {
      stripeAccount: accountId // This is important - creates payout from connected account
    });

    res.json({
      success: true,
      payoutId: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      method: payout.method,
      status: payout.status,
      arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
      estimatedArrival: payout.estimated_arrival_date ? new Date(payout.estimated_arrival_date * 1000).toISOString() : null,
      fee: payout.fees ? payout.fees / 100 : 0 // Instant payout fee is ~1%
    });
  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payout' 
    });
  }
});

/**
 * Get payout history
 * GET /api/stripe/payouts/:accountId
 */
app.get('/api/stripe/payouts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Check if this is a test business account
    const isTestBusiness = accountId === 'test-business-1' || 
                          accountId === 'business@echochat.com' ||
                          accountId.includes('test-business') ||
                          accountId === 'test_account';

    if (isTestBusiness) {
      // Return sample payout data for test business account
      const samplePayouts = [
        {
          id: 'po_sample_001',
          amount: 200.00,
          currency: 'usd',
          status: 'paid',
          method: 'standard',
          arrivalDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedArrival: null,
          created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'ba_sample_001',
          failureCode: null,
          failureMessage: null,
          fee: 0.00
        },
        {
          id: 'po_sample_002',
          amount: 50.00,
          currency: 'usd',
          status: 'paid',
          method: 'instant',
          arrivalDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedArrival: null,
          created: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'card_sample_001',
          failureCode: null,
          failureMessage: null,
          fee: 0.50
        },
        {
          id: 'po_sample_003',
          amount: 150.00,
          currency: 'usd',
          status: 'pending',
          method: 'standard',
          arrivalDate: null,
          estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'ba_sample_001',
          failureCode: null,
          failureMessage: null,
          fee: 0.00
        }
      ];

      return res.json({
        payouts: samplePayouts.slice(0, limit),
        count: samplePayouts.length,
        hasMore: false
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    const payouts = await stripe.payouts.list({
      limit: limit,
    }, {
      stripeAccount: accountId
    });

    res.json({
      payouts: payouts.data.map(p => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency,
        status: p.status,
        method: p.method,
        arrivalDate: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString() : null,
        estimatedArrival: p.estimated_arrival_date ? new Date(p.estimated_arrival_date * 1000).toISOString() : null,
        created: new Date(p.created * 1000).toISOString(),
        destination: p.destination,
        failureCode: p.failure_code,
        failureMessage: p.failure_message,
        fee: p.fees ? p.fees / 100 : 0
      })),
      count: payouts.data.length,
      hasMore: payouts.has_more
    });
  } catch (error) {
    console.error('Error getting payouts:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get payouts' 
    });
  }
});

/**
 * Get payout schedule/settings
 * GET /api/stripe/payout-schedule/:accountId
 */
app.get('/api/stripe/payout-schedule/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await stripe.accounts.retrieve(accountId);

    res.json({
      payoutEnabled: account.payouts_enabled,
      payoutSchedule: {
        delayDays: account.settings?.payouts?.schedule?.delay_days,
        interval: account.settings?.payouts?.schedule?.interval, // 'manual', 'daily', 'weekly', 'monthly'
        weeklyAnchor: account.settings?.payouts?.schedule?.weekly_anchor,
        monthlyAnchor: account.settings?.payouts?.schedule?.monthly_anchor
      },
      statementDescriptor: account.settings?.payouts?.statement_descriptor,
      debitNegativeBalances: account.settings?.payouts?.debit_negative_balances
    });
  } catch (error) {
    console.error('Error getting payout schedule:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get payout schedule' 
    });
  }
});

// ==================== Transaction History ====================

/**
 * Get transactions for a user
 * GET /api/stripe/transactions/:userId
 */
app.get('/api/stripe/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Get balance transactions
    const transactions = await stripe.balanceTransactions.list({
      limit: limit,
      expand: ['data.source'],
    });

    // Filter transactions related to this user
    // In production, you'd store transaction metadata in database
    const userTransactions = transactions.data.filter(t => 
      t.metadata?.userId === userId || 
      t.metadata?.senderId === userId ||
      t.metadata?.recipientId === userId
    );

    res.json({
      transactions: userTransactions.map(t => ({
        id: t.id,
        amount: t.amount / 100,
        currency: t.currency,
        type: t.type,
        status: t.status,
        created: new Date(t.created * 1000).toISOString(),
        description: t.description,
        fee: t.fee / 100,
        net: t.net / 100
      })),
      count: userTransactions.length
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get transactions' 
    });
  }
});

// ==================== Subscription Routes ====================

/**
 * Create subscription for business account
 * POST /api/stripe/create-subscription
 */
app.post('/api/stripe/create-subscription', async (req, res) => {
  try {
    const { userId, email, accountId } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

    // Check if this is a test business account
    const isTestBusiness = userId === 'test-business-1' || 
                          userId === 'business@echochat.com' ||
                          userId.includes('test-business');

    if (isTestBusiness) {
      // Return sample subscription for test account
      return res.json({
        success: true,
        subscriptionId: 'sub_test_001',
        customerId: 'cus_test_001',
        status: 'trialing',
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isTestAccount: true
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Create or get customer
    let customer;
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
          app: 'EchoDynamo'
        }
      });
    }

    // Create product and price for business subscription
    // In production, you'd create these once and reuse the price ID
    let priceId = process.env.STRIPE_BUSINESS_PRICE_ID;
    
    if (!priceId) {
      // Create product
      const product = await stripe.products.create({
        name: 'EchoDynamo Business Plan',
        description: 'Monthly subscription for business accounts',
        metadata: {
          app: 'EchoDynamo',
          planType: 'business'
        }
      });

      // Create price with $30/month and 7-day trial
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 3000, // $30.00
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          planType: 'business'
        }
      });

      priceId = price.id;
    }

    // Create subscription with 7-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: 7,
      metadata: {
        userId: userId,
        accountType: 'business',
        app: 'EchoDynamo'
      }
    });

    res.json({
      success: true,
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      priceId: priceId
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create subscription' 
    });
  }
});

/**
 * Get subscription status
 * GET /api/stripe/subscription/:userId
 */
app.get('/api/stripe/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if this is a test business account
    const isTestBusiness = userId === 'test-business-1' || 
                          userId === 'business@echochat.com' ||
                          userId.includes('test-business');

    if (isTestBusiness) {
      // Return sample subscription for test account
      return res.json({
        subscriptionId: 'sub_test_001',
        customerId: 'cus_test_001',
        status: 'trialing',
        trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        amount: 30.00,
        currency: 'usd',
        isTestAccount: true
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Find customer by userId metadata
    const customers = await stripe.customers.list({
      limit: 100
    });

    const customer = customers.data.find(c => c.metadata?.userId === userId);

    if (!customer) {
      return res.status(404).json({ 
        error: 'Customer not found' 
      });
    }

    // Get subscriptions for customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1,
      status: 'all'
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({ 
        error: 'No subscription found' 
      });
    }

    const subscription = subscriptions.data[0];
    const price = subscription.items.data[0]?.price;

    // For trialing subscriptions, current_period_end equals trial_end
    // Calculate next billing date: if trialing, it's trial_end + 1 billing interval
    let nextBillingDate = subscription.current_period_end;
    if (subscription.status === 'trialing' && subscription.trial_end) {
      // Next billing starts after trial ends, so add one month to trial_end
      const trialEndTime = subscription.trial_end * 1000;
      const oneMonth = 30 * 24 * 60 * 60 * 1000; // Approximate month
      nextBillingDate = Math.floor((trialEndTime + oneMonth) / 1000);
    }

    res.json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate * 1000).toISOString() : new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      amount: (price?.unit_amount || 0) / 100,
      currency: price?.currency || 'usd',
      interval: price?.recurring?.interval || 'month'
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get subscription' 
    });
  }
});

/**
 * Cancel subscription
 * POST /api/stripe/cancel-subscription/:userId
 */
app.post('/api/stripe/cancel-subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cancelImmediately = false } = req.body;

    // Check if this is a test business account
    const isTestBusiness = userId === 'test-business-1' || 
                          userId === 'business@echochat.com' ||
                          userId.includes('test-business');

    if (isTestBusiness) {
      return res.json({
        success: true,
        message: 'Test account subscription cancelled (demo)',
        isTestAccount: true
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Find customer by userId metadata
    const customers = await stripe.customers.list({
      limit: 100
    });

    const customer = customers.data.find(c => c.metadata?.userId === userId);

    if (!customer) {
      return res.status(404).json({ 
        error: 'Customer not found' 
      });
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1,
      status: 'active'
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({ 
        error: 'No active subscription found' 
      });
    }

    const subscription = subscriptions.data[0];

    if (cancelImmediately) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.id);
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true
      });
    }

    res.json({
      success: true,
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: !cancelImmediately
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to cancel subscription' 
    });
  }
});

/**
 * Create Customer Portal session for managing subscription and payment method
 * POST /api/stripe/create-portal-session
 */
app.post('/api/stripe/create-portal-session', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Find customer by userId metadata
    const customers = await stripe.customers.list({
      limit: 100
    });

    const customer = customers.data.find(c => c.metadata?.userId === userId);

    if (!customer) {
      return res.status(404).json({ 
        error: 'Customer not found. Please create a subscription first.' 
      });
    }

    // Create Customer Portal session
    // This allows customers to update payment method, view invoices, and manage subscription
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?portal_return=success`,
    });

    res.json({
      success: true,
      url: portalSession.url
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create portal session' 
    });
  }
});

/**
 * Create checkout session for subscription
 * POST /api/stripe/create-checkout-session
 */
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { userId, email, accountId } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

    // Check if this is a test business account
    const isTestBusiness = userId === 'test-business-1' || 
                          userId === 'business@echochat.com' ||
                          userId.includes('test-business');

    if (isTestBusiness) {
      return res.json({
        success: true,
        sessionId: 'cs_test_001',
        url: null,
        message: 'Test account - subscription creation skipped',
        isTestAccount: true
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY' 
      });
    }

    // Get or create price ID
    let priceId = process.env.STRIPE_BUSINESS_PRICE_ID;
    
    if (!priceId) {
      // Create product and price if not exists
      const product = await stripe.products.create({
        name: 'EchoDynamo Business Plan',
        description: 'Monthly subscription for business accounts'
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 3000, // $30.00
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      });

      priceId = price.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: userId,
          accountType: 'business'
        }
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?session_id={CHECKOUT_SESSION_ID}&checkout_status=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?checkout_status=cancel`,
      metadata: {
        userId: userId,
        accountType: 'business'
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create checkout session' 
    });
  }
});

// ==================== Webhook Handler ====================

/**
 * Stripe webhook endpoint
 * POST /api/stripe/webhook
 */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
      event = JSON.parse(req.body);
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received webhook: ${event.type}`);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      // Update your database, send notification, etc.
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('PaymentIntent failed:', failedPayment.id);
      // Handle failed payment
      break;

    case 'transfer.created':
      const transfer = event.data.object;
      console.log('Transfer created:', transfer.id);
      // Update your database
      break;

    case 'account.updated':
      const account = event.data.object;
      console.log('Account updated:', account.id);
      // Update account status in database
      break;

    case 'customer.subscription.created':
      const newSubscription = event.data.object;
      console.log('Subscription created:', newSubscription.id);
      // Update database with subscription info
      break;

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object;
      console.log('Subscription updated:', updatedSubscription.id);
      // Update subscription status in database
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('Subscription deleted:', deletedSubscription.id);
      // Update database - subscription cancelled
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Invoice payment succeeded:', invoice.id);
      // Update subscription status, send confirmation
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log('❌ Invoice payment failed:', failedInvoice.id);
      console.log('   Amount:', failedInvoice.amount_due / 100, failedInvoice.currency);
      console.log('   Customer:', failedInvoice.customer);
      console.log('   Subscription:', failedInvoice.subscription);
      console.log('   Attempt Count:', failedInvoice.attempt_count);
      
      // Retrieve subscription to get status
      if (failedInvoice.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(failedInvoice.subscription);
          console.log(`   Subscription Status: ${subscription.status}`);
          console.log(`   ⚠️  Subscription is now: ${subscription.status}`);
          
          // Stripe automatically retries failed payments
          // After 3 failed attempts, subscription becomes 'unpaid' or 'past_due'
          // Customer needs to update payment method via Customer Portal
          if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            console.log(`   🔴 Action Required: Customer must update payment method`);
            console.log(`   📧 Send notification to customer to update payment method`);
            // In production: Send email notification, push notification, etc.
          }
        } catch (err) {
          console.error('Error retrieving subscription:', err);
        }
      }
      // Notify user, update subscription status in database
      break;

    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('✅ Checkout session completed:', session.id);
      console.log('   Customer:', session.customer);
      console.log('   Subscription:', session.subscription);
      console.log('   Mode:', session.mode);
      
      // For subscription mode, the subscription is automatically created
      // with payment method attached and trial period started
      if (session.mode === 'subscription' && session.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log(`   Subscription Status: ${subscription.status}`);
          console.log(`   Trial End: ${subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : 'N/A'}`);
          console.log(`   Payment Method: ${subscription.default_payment_method ? 'Attached' : 'Not attached'}`);
          console.log(`   ✅ Customer will be charged $30 at the end of 7-day trial`);
        } catch (err) {
          console.error('Error retrieving subscription:', err);
        }
      }
      // Subscription activated, update database if needed
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// ==================== Error Handler ====================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Start server (only when running directly, not when imported as a serverless handler)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 EchoDynamo Backend Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`💳 Stripe API: Ready`);
    console.log(`📡 Webhooks: http://localhost:${PORT}/api/stripe/webhook`);
    
    if (!process.env.STRIPE_SECRET_KEY && !process.env.VITE_STRIPE_SECRET_KEY) {
      console.warn('⚠️  Warning: STRIPE_SECRET_KEY not set!');
    }
  });
}

module.exports = app;

