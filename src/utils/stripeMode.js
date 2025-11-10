// Utility to detect Stripe mode (test vs live)

/**
 * Detects if Stripe is configured in test mode or live mode
 * @returns {Object} { mode: 'test' | 'live' | 'not_configured', publishableKey: string, secretKey: string }
 */
export function getStripeMode() {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const secretKey = import.meta.env.VITE_STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;

  if (!publishableKey && !secretKey) {
    return {
      mode: 'not_configured',
      publishableKey: null,
      secretKey: null,
      message: 'Stripe is not configured'
    };
  }

  // Check publishable key
  const isPublishableTest = publishableKey?.startsWith('pk_test_');
  const isPublishableLive = publishableKey?.startsWith('pk_live_');

  // Check secret key
  const isSecretTest = secretKey?.startsWith('sk_test_');
  const isSecretLive = secretKey?.startsWith('sk_live_');

  // Determine mode
  let mode = 'not_configured';
  let message = '';

  if (isPublishableLive || isSecretLive) {
    mode = 'live';
    message = '⚠️ LIVE MODE - Real payments will be processed!';
  } else if (isPublishableTest || isSecretTest) {
    mode = 'test';
    message = 'Test mode - Using Stripe test environment';
  } else if (publishableKey || secretKey) {
    mode = 'unknown';
    message = 'Stripe keys detected but format is unrecognized';
  }

  // Check for mismatch
  if (publishableKey && secretKey) {
    if ((isPublishableTest && isSecretLive) || (isPublishableLive && isSecretTest)) {
      mode = 'mismatch';
      message = '⚠️ WARNING: Publishable and secret keys are in different modes!';
    }
  }

  return {
    mode,
    publishableKey: publishableKey ? (isPublishableLive ? 'pk_live_***' : 'pk_test_***') : null,
    secretKey: secretKey ? (isSecretLive ? 'sk_live_***' : 'sk_test_***') : null,
    message,
    isLive: mode === 'live',
    isTest: mode === 'test'
  };
}

/**
 * Logs Stripe mode to console (useful for debugging)
 */
export function logStripeMode() {
  const info = getStripeMode();
  console.log('🔍 Stripe Configuration:', info.message);
  console.log('   Mode:', info.mode);
  console.log('   Publishable Key:', info.publishableKey || 'Not set');
  console.log('   Secret Key:', info.secretKey || 'Not set');

  if (info.mode === 'live') {
    console.warn('⚠️  LIVE MODE DETECTED - Real payments enabled!');
  } else if (info.mode === 'test') {
    console.log('✅ Test mode - Safe for development');
  } else if (info.mode === 'not_configured') {
    console.warn('⚠️  Stripe not configured - Payment features disabled');
  }

  return info;
}

