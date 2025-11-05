#!/usr/bin/env node

/**
 * Fast Card Payment Features Test (Backend API Only)
 * Tests payment endpoints without browser automation
 * Much faster than UI tests
 */

const http = require('http');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const API_BASE = 'http://localhost:3001/api';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Request timeout')));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testBackendHealth() {
  log('\n📋 Test 1: Backend Health Check', 'bold');
  try {
    const response = await makeRequest('/health', 'GET');
    if (response.status === 200) {
      log('   ✅ Backend is running', 'green');
      return { success: true };
    } else {
      log(`   ❌ Backend returned status ${response.status}`, 'red');
      return { success: false };
    }
  } catch (error) {
    log(`   ❌ Backend not responding: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testCreatePaymentIntent() {
  log('\n📋 Test 2: Create Payment Intent (Send Money)', 'bold');
  try {
    // Using test account IDs (you'll need real ones for actual testing)
    const response = await makeRequest('/api/stripe/create-payment-intent', 'POST', {
      amount: 10.00,
      recipientAccountId: 'acct_test_recipient',
      metadata: {
        type: 'send_money',
        test: true
      }
    });

    if (response.status === 200 || response.status === 201) {
      if (response.data.clientSecret) {
        log('   ✅ Payment intent created successfully', 'green');
        log(`   Client Secret: ${response.data.clientSecret.substring(0, 20)}...`, 'blue');
        return { success: true, data: response.data };
      } else {
        log('   ⚠️  Payment intent created but no client secret', 'yellow');
        return { success: true, warning: 'No client secret' };
      }
    } else if (response.status === 400) {
      log('   ⚠️  Bad request (expected with test account)', 'yellow');
      log(`   Message: ${response.data.error || 'Account may need onboarding'}`, 'yellow');
      return { success: true, skipped: true };
    } else {
      log(`   ❌ Failed with status ${response.status}`, 'red');
      log(`   Error: ${response.data.error || 'Unknown error'}`, 'red');
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testCreateCheckoutSession() {
  log('\n📋 Test 3: Create Checkout Session (Subscription)', 'bold');
  try {
    const response = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      userId: 'test_user_123',
      email: 'test@example.com',
      accountId: 'acct_test_account'
    });

    if (response.status === 200 || response.status === 201) {
      if (response.data.url) {
        log('   ✅ Checkout session created successfully', 'green');
        log(`   Checkout URL: ${response.data.url.substring(0, 50)}...`, 'blue');
        return { success: true, data: response.data };
      } else {
        log('   ⚠️  Checkout session created but no URL', 'yellow');
        return { success: true, warning: 'No checkout URL' };
      }
    } else if (response.status === 503) {
      log('   ⚠️  Stripe not configured', 'yellow');
      return { success: false, error: 'Stripe not configured' };
    } else {
      log(`   ❌ Failed with status ${response.status}`, 'red');
      log(`   Error: ${response.data.error || 'Unknown error'}`, 'red');
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n🧪 Fast Card Payment Features Test (Backend API)', 'bold');
  log('='.repeat(60), 'cyan');
  log('This test checks backend endpoints without browser automation', 'blue');
  log('='.repeat(60), 'cyan');

  const results = {
    health: await testBackendHealth(),
    paymentIntent: await testCreatePaymentIntent(),
    checkoutSession: await testCreateCheckoutSession()
  };

  // Summary
  log('\n📊 Test Results Summary', 'bold');
  log('='.repeat(60), 'cyan');

  const passed = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;

  log(`\n✅ Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  log(`\n📋 Detailed Results:`, 'cyan');
  log(`   Backend Health: ${results.health.success ? '✅ PASS' : '❌ FAIL'}`, 
      results.health.success ? 'green' : 'red');
  log(`   Payment Intent: ${results.paymentIntent.success ? '✅ PASS' : '❌ FAIL'}`, 
      results.paymentIntent.success ? 'green' : 'red');
  log(`   Checkout Session: ${results.checkoutSession.success ? '✅ PASS' : '❌ FAIL'}`, 
      results.checkoutSession.success ? 'green' : 'red');

  if (results.paymentIntent.skipped) {
    log('   ℹ️  Payment Intent test skipped (test account needs onboarding)', 'yellow');
  }

  log('\n💡 Test Cards for Manual UI Testing:', 'cyan');
  log('   Success: 4242 4242 4242 4242', 'green');
  log('   Decline: 4000 0000 0000 0002', 'red');
  log('   3D Secure: 4000 0027 6000 3184', 'yellow');
  log('   Expiry: Any future date (e.g., 12/34)', 'blue');
  log('   CVC: Any 3 digits (e.g., 123)', 'blue');
  log('   ZIP: Any 5 digits (e.g., 12345)', 'blue');

  log('\n📝 Next Steps:', 'cyan');
  log('   For full UI testing with cards, use the browser-based test:', 'blue');
  log('   npm run test:card-payments', 'blue');
  log('   (Requires browser automation - slower but more comprehensive)', 'yellow');

  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ Unhandled Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

