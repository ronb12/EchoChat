/**
 * Test script for Stripe backend endpoints
 * Run with: node server/test-stripe.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/stripe`;

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testHealthCheck() {
  log('\n🏥 Test 1: Health Check', 'cyan');
  try {
    const result = await makeRequest('GET', '/health');
    if (result.status === 200) {
      log('✅ Server is running', 'green');
      return true;
    } else {
      log(`❌ Health check failed: ${result.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    log('💡 Make sure the server is running: npm run server', 'yellow');
    return false;
  }
}

async function testCreateAccount() {
  log('\n📝 Test 2: Create Connected Account', 'cyan');
  try {
    const testEmail = `test_${Date.now()}@example.com`;
    const result = await makeRequest('POST', `${API_BASE}/create-account`, {
      userId: 'test_user_123',
      email: testEmail,
      country: 'US'
    });

    if (result.status === 200 && result.data.success) {
      log(`✅ Account created: ${result.data.accountId}`, 'green');
      log(`   Email: ${testEmail}`, 'blue');
      log(`   Onboarding URL: ${result.data.onboardingUrl ? 'Generated' : 'None'}`, 'blue');
      return result.data.accountId;
    } else {
      log(`❌ Failed: ${result.data.error || 'Unknown error'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testCreatePaymentIntent(recipientAccountId) {
  log('\n💵 Test 3: Create Payment Intent', 'cyan');
  try {
    const amount = 25.00;
    const result = await makeRequest('POST', `${API_BASE}/create-payment-intent`, {
      amount: amount,
      recipientAccountId: recipientAccountId || 'acct_test_recipient',
      metadata: {
        senderId: 'test_user_123',
        recipientId: 'test_user_456',
        note: 'Test payment'
      }
    });

    if (result.status === 200 && result.data.clientSecret) {
      log(`✅ Payment Intent created: ${result.data.paymentIntentId}`, 'green');
      log(`   Amount: $${result.data.amount}`, 'blue');
      log(`   Status: ${result.data.status}`, 'blue');
      log(`   Client Secret: ${result.data.clientSecret.substring(0, 20)}...`, 'blue');
      return result.data;
    } else {
      log(`❌ Failed: ${result.data.error || 'Unknown error'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testCreatePaymentRequest(recipientAccountId) {
  log('\n📤 Test 4: Create Payment Request', 'cyan');
  try {
    const amount = 50.00;
    const result = await makeRequest('POST', `${API_BASE}/create-payment-request`, {
      amount: amount,
      description: 'Test money request',
      recipientAccountId: recipientAccountId || 'acct_test_recipient',
      metadata: {
        requestorId: 'test_user_123',
        note: 'Test payment request'
      }
    });

    if (result.status === 200 && result.data.paymentLink) {
      log(`✅ Payment Request created`, 'green');
      log(`   Amount: $${result.data.amount}`, 'blue');
      log(`   Payment Link: ${result.data.paymentLink}`, 'blue');
      log(`   Product ID: ${result.data.productId}`, 'blue');
      return result.data;
    } else {
      log(`❌ Failed: ${result.data.error || 'Unknown error'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function runTests() {
  log('\n🚀 Stripe Backend API Tests', 'green');
  log('════════════════════════════════════════', 'green');
  log(`Server: ${BASE_URL}`, 'blue');
  log(`Date: ${new Date().toLocaleString()}`, 'blue');

  const results = {
    healthCheck: false,
    createAccount: null,
    paymentIntent: null,
    paymentRequest: null
  };

  // Test 1: Health Check
  results.healthCheck = await testHealthCheck();
  if (!results.healthCheck) {
    log('\n⚠️  Server is not running. Start it with: npm run server', 'yellow');
    return;
  }

  // Test 2: Create Account
  results.createAccount = await testCreateAccount();

  // Test 3: Create Payment Intent
  results.paymentIntent = await testCreatePaymentIntent(results.createAccount);

  // Test 4: Create Payment Request
  results.paymentRequest = await testCreatePaymentRequest(results.createAccount);

  // Summary
  log('\n📊 Test Summary', 'yellow');
  log('─────────────────────────────────────', 'yellow');
  
  const tests = [
    { name: 'Health Check', result: results.healthCheck },
    { name: 'Create Account', result: !!results.createAccount },
    { name: 'Create Payment Intent', result: !!results.paymentIntent },
    { name: 'Create Payment Request', result: !!results.paymentRequest }
  ];

  tests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    const color = test.result ? 'green' : 'red';
    log(`${icon} ${test.name}: ${test.result ? 'PASSED' : 'FAILED'}`, color);
  });

  const passed = tests.filter(t => t.result).length;
  const total = tests.length;
  log(`\n${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  log('\n💡 To test with Stripe CLI:', 'yellow');
  log('   1. Start server: npm run server', 'blue');
  log('   2. Forward webhooks: stripe listen --forward-to localhost:3001/api/stripe/webhook', 'blue');
  log('   3. Use the API endpoints from the server', 'blue');
  log('\n');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Error running tests: ${error.message}`, 'red');
  process.exit(1);
});



