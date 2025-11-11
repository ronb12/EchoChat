/**
 * EchoChat API - Firebase Cloud Functions
 * Complete backend API for EchoChat messaging platform
 * Handles Stripe payments, subscriptions, and webhooks
 * 
 * Deploy with: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express app
const app = express();

// Initialize Stripe
const stripeKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY not configured. Stripe features will not work.');
}

const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
}) : null;

// CORS configuration
const corsOptions = {
  origin: [
    'https://echochat-messaging.web.app',
    'https://echochat-messaging.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    api: 'EchoChat API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
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
        app: 'EchoChat',
        accountType: isBusinessAccount ? 'business' : 'personal'
      }
    });

    // Create account link for onboarding
    const frontendUrl = functions.config().app?.frontend_url || 'https://echochat-messaging.web.app';
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${frontendUrl}/stripe/refresh`,
      return_url: `${frontendUrl}/stripe/return`,
      type: 'account_onboarding',
    });

    // If business account, create Stripe Checkout session
    let checkoutSession = null;
    if (isBusinessAccount) {
      try {
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
              app: 'EchoChat'
            }
          });
        }

        let priceId = functions.config().stripe?.business_price_id;
        
        if (!priceId) {
          const product = await stripe.products.create({
            name: 'EchoChat Business Plan',
            description: 'Monthly subscription for business accounts'
          });

          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: 3000,
            currency: 'usd',
            recurring: {
              interval: 'month'
            }
          });

          priceId = price.id;
        }

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
              app: 'EchoChat',
              stripeAccountId: account.id
            }
          },
          success_url: `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&checkout_status=success&account_id=${account.id}`,
          cancel_url: `${frontendUrl}?checkout_status=cancel&account_id=${account.id}`,
          metadata: {
            userId: userId,
            accountId: account.id,
            accountType: 'business'
          },
          allow_promotion_codes: true
        });
      } catch (checkoutError) {
        console.error('Error creating checkout session:', checkoutError);
        checkoutSession = null;
      }
    }

    res.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      checkoutUrl: checkoutSession ? checkoutSession.url : null,
      checkoutSessionId: checkoutSession ? checkoutSession.id : null,
      requiresCheckout: isBusinessAccount,
      message: isBusinessAccount && checkoutSession 
        ? 'Please complete checkout to start your 7-day free trial.'
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
    
    const isTestBusiness = userId === 'test-business-1' || 
                          userId === 'business@echochat.com' ||
                          userId.includes('test-business');
    
    if (isTestBusiness) {
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
    
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured' 
      });
    }
    
    const accounts = await stripe.accounts.list({ limit: 100 });
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

/**
 * Create account link
 * POST /api/stripe/create-account-link
 */
app.post('/api/stripe/create-account-link', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured' 
      });
    }

    const { accountId, type = 'account_onboarding' } = req.body;

    if (!accountId) {
      return res.status(400).json({ 
        error: 'accountId is required' 
      });
    }

    const frontendUrl = functions.config().app?.frontend_url || 'https://echochat-messaging.web.app';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/stripe/refresh`,
      return_url: `${frontendUrl}/stripe/return`,
      type: type,
    });

    res.json({
      success: true,
      url: accountLink.url
    });
  } catch (error) {
    console.error('Error creating account link:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create account link' 
    });
  }
});

// ==================== Payment Routes ====================

/**
 * Create payment intent
 * POST /api/stripe/create-payment-intent
 */
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured' 
      });
    }

    const { amount, recipientAccountId, metadata = {} } = req.body;

    if (!amount || !recipientAccountId) {
      return res.status(400).json({ 
        error: 'amount and recipientAccountId are required' 
      });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (amountInCents < 100) {
      return res.status(400).json({ 
        error: 'Minimum amount is $1.00' 
      });
    }

    let transfersEnabled = false;
    try {
      const account = await stripe.accounts.retrieve(recipientAccountId);
      transfersEnabled = account.capabilities?.transfers === 'active';
    } catch (accountError) {
      console.warn('Could not retrieve account:', accountError.message);
    }

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

    if (transfersEnabled) {
      paymentIntentOptions.application_fee_amount = Math.round(amountInCents * 0.029 + 30);
      paymentIntentOptions.transfer_data = {
        destination: recipientAccountId,
      };
    } else {
      paymentIntentOptions.metadata.needsTransfer = 'true';
      paymentIntentOptions.metadata.recipientAccountId = recipientAccountId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents / 100,
      currency: 'usd',
      transfersEnabled: transfersEnabled,
      accountReady: transfersEnabled,
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

// ==================== Subscription Routes ====================

/**
 * Get subscription status
 * GET /api/stripe/subscription/:userId
 */
app.get('/api/stripe/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const isTestBusiness = userId === 'test-business-1' || 
                          userId === 'business@echochat.com' ||
                          userId.includes('test-business');

    if (isTestBusiness) {
      return res.json({
        subscriptionId: 'sub_test_001',
        customerId: 'cus_test_001',
        status: 'trialing',
        trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        nextBillingDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        amount: 30.00,
        currency: 'usd',
        isTestAccount: true
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured' 
      });
    }

    const customers = await stripe.customers.list({ limit: 100 });
    const customer = customers.data.find(c => c.metadata?.userId === userId);

    if (!customer) {
      return res.status(404).json({ 
        error: 'Customer not found' 
      });
    }

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

    let nextBillingDate = subscription.current_period_end;
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEndTime = subscription.trial_end * 1000;
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      nextBillingDate = Math.floor((trialEndTime + oneMonth) / 1000);
    }

    res.json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate * 1000).toISOString() : null,
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
 * Create checkout session
 * POST /api/stripe/create-checkout-session
 */
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured' 
      });
    }

    const { userId, email, accountId } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

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
        metadata: { userId, app: 'EchoChat' }
      });
    }

    let priceId = functions.config().stripe?.business_price_id;
    if (!priceId) {
      const product = await stripe.products.create({
        name: 'EchoChat Business Plan',
        description: 'Monthly subscription'
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 3000,
        currency: 'usd',
        recurring: { interval: 'month' }
      });

      priceId = price.id;
    }

    const frontendUrl = functions.config().app?.frontend_url || 'https://echochat-messaging.web.app';
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId, accountType: 'business', app: 'EchoChat', stripeAccountId: accountId }
      },
      success_url: `${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&checkout_status=success`,
      cancel_url: `${frontendUrl}?checkout_status=cancel`,
      metadata: { userId, accountType: 'business' }
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

/**
 * Create customer portal session
 * POST /api/stripe/create-portal-session
 */
app.post('/api/stripe/create-portal-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe is not configured' 
      });
    }

    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ 
        error: 'Customer not found' 
      });
    }

    const frontendUrl = functions.config().app?.frontend_url || 'https://echochat-messaging.web.app';
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${frontendUrl}?portal_return=success`,
    });

    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create portal session' 
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
  const webhookSecret = functions.config().stripe?.webhook_secret;

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

  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('PaymentIntent succeeded:', event.data.object.id);
      break;

    case 'invoice.payment_succeeded':
      console.log('Invoice payment succeeded:', event.data.object.id);
      break;

    case 'invoice.payment_failed':
      console.log('Invoice payment failed:', event.data.object.id);
      console.log('Customer should update payment method');
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      console.log('Subscription updated:', event.data.object.id);
      break;

    case 'checkout.session.completed':
      console.log('Checkout session completed:', event.data.object.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Export as Firebase Cloud Function
exports.api = functions.https.onRequest(app);

