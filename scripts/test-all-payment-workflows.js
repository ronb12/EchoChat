#!/usr/bin/env node

/**
 * Comprehensive Payment Workflows Test
 * Tests all payment features: Send Money, Request Money, Cashout, and Business Subscription
 * 
 * Usage: node scripts/test-all-payment-workflows.js
 */

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
  bold: '\x1b[1m'
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
  log('─────────────────────────────────────', 'cyan');
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
    return false;
  }
}

async function testSendMoneyWorkflow() {
  log('\n💵 Test 2: Send Money Workflow', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  const results = {
    createSenderAccount: null,
    createRecipientAccount: null,
    createPaymentIntent: null,
    paymentIntentId: null
  };

  try {
    // Step 1: Create sender account
    log('\n📝 Step 1: Creating sender account...', 'blue');
    const senderEmail = `sender_${Date.now()}@test.com`;
    const senderResult = await makeRequest('POST', `${API_BASE}/create-account`, {
      userId: 'test_sender_123',
      email: senderEmail,
      country: 'US'
    });

    if (senderResult.status === 200 && senderResult.data.success) {
      results.createSenderAccount = senderResult.data.accountId;
      log(`✅ Sender account created: ${results.createSenderAccount}`, 'green');
    } else {
      log(`❌ Failed to create sender account: ${senderResult.data.error}`, 'red');
      return results;
    }

    // Step 2: Create recipient account
    log('\n📝 Step 2: Creating recipient account...', 'blue');
    const recipientEmail = `recipient_${Date.now()}@test.com`;
    const recipientResult = await makeRequest('POST', `${API_BASE}/create-account`, {
      userId: 'test_recipient_456',
      email: recipientEmail,
      country: 'US'
    });

    if (recipientResult.status === 200 && recipientResult.data.success) {
      results.createRecipientAccount = recipientResult.data.accountId;
      log(`✅ Recipient account created: ${results.createRecipientAccount}`, 'green');
    } else {
      log(`❌ Failed to create recipient account: ${recipientResult.data.error}`, 'red');
      return results;
    }

    // Step 3: Create payment intent
    log('\n💳 Step 3: Creating payment intent ($25.00)...', 'blue');
    const paymentIntentResult = await makeRequest('POST', `${API_BASE}/create-payment-intent`, {
      amount: 25.00,
      recipientAccountId: results.createRecipientAccount,
      metadata: {
        senderId: 'test_sender_123',
        recipientId: 'test_recipient_456',
        note: 'Test payment workflow'
      }
    });

    if (paymentIntentResult.status === 200 && paymentIntentResult.data.clientSecret) {
      results.createPaymentIntent = true;
      results.paymentIntentId = paymentIntentResult.data.paymentIntentId;
      log(`✅ Payment intent created: ${results.paymentIntentId}`, 'green');
      log(`   Amount: $${paymentIntentResult.data.amount}`, 'blue');
      log(`   Status: ${paymentIntentResult.data.status}`, 'blue');
      log(`   Transfers Enabled: ${paymentIntentResult.data.transfersEnabled ? 'Yes' : 'No (needs onboarding)'}`, 'blue');
    } else {
      log(`❌ Failed to create payment intent: ${paymentIntentResult.data.error}`, 'red');
    }

  } catch (error) {
    log(`❌ Error in Send Money workflow: ${error.message}`, 'red');
  }

  return results;
}

async function testRequestMoneyWorkflow() {
  log('\n📤 Test 3: Request Money Workflow', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  const results = {
    createRequestorAccount: null,
    createPaymentRequest: null,
    paymentLink: null
  };

  try {
    // Step 1: Create requestor account
    log('\n📝 Step 1: Creating requestor account...', 'blue');
    const requestorEmail = `requestor_${Date.now()}@test.com`;
    const requestorResult = await makeRequest('POST', `${API_BASE}/create-account`, {
      userId: 'test_requestor_789',
      email: requestorEmail,
      country: 'US'
    });

    if (requestorResult.status === 200 && requestorResult.data.success) {
      results.createRequestorAccount = requestorResult.data.accountId;
      log(`✅ Requestor account created: ${results.createRequestorAccount}`, 'green');
    } else {
      log(`❌ Failed to create requestor account: ${requestorResult.data.error}`, 'red');
      return results;
    }

    // Step 2: Create payment request
    log('\n💳 Step 2: Creating payment request ($50.00)...', 'blue');
    const paymentRequestResult = await makeRequest('POST', `${API_BASE}/create-payment-request`, {
      amount: 50.00,
      description: 'Test payment request workflow',
      recipientAccountId: results.createRequestorAccount,
      metadata: {
        requestorId: 'test_requestor_789',
        note: 'Test request money'
      }
    });

    if (paymentRequestResult.status === 200 && paymentRequestResult.data.paymentLink) {
      results.createPaymentRequest = true;
      results.paymentLink = paymentRequestResult.data.paymentLink;
      log(`✅ Payment request created`, 'green');
      log(`   Amount: $${paymentRequestResult.data.amount}`, 'blue');
      log(`   Payment Link: ${paymentRequestResult.data.paymentLink}`, 'blue');
      log(`   Product ID: ${paymentRequestResult.data.productId}`, 'blue');
    } else {
      log(`❌ Failed to create payment request: ${paymentRequestResult.data.error}`, 'red');
    }

  } catch (error) {
    log(`❌ Error in Request Money workflow: ${error.message}`, 'red');
  }

  return results;
}

async function testCashoutWorkflow() {
  log('\n💰 Test 4: Cashout Workflow', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  const results = {
    createAccount: null,
    getBalance: null,
    getExternalAccounts: null,
    createAccountLink: null,
    accountId: null
  };

  try {
    // Step 0: Create a real account for cashout testing
    log('\n📝 Step 0: Creating account for cashout testing...', 'blue');
    const cashoutEmail = `cashout_${Date.now()}@test.com`;
    const accountResult = await makeRequest('POST', `${API_BASE}/create-account`, {
      userId: 'test_cashout_user',
      email: cashoutEmail,
      country: 'US'
    });

    let accountId;
    if (accountResult.status === 200 && accountResult.data.success) {
      accountId = accountResult.data.accountId;
      results.createAccount = true;
      results.accountId = accountId;
      log(`✅ Account created: ${accountId}`, 'green');
    } else {
      // Fallback to test account handling if creation fails
      accountId = 'test_account_cashout';
      log(`⚠️  Using test account fallback: ${accountId}`, 'yellow');
    }

    // Step 1: Get balance
    log('\n📊 Step 1: Getting account balance...', 'blue');
    const balanceResult = await makeRequest('GET', `${API_BASE}/balance/${accountId}`);

    if (balanceResult.status === 200) {
      results.getBalance = true;
      log(`✅ Balance retrieved`, 'green');
      log(`   Available: $${balanceResult.data.available || 0}`, 'blue');
      log(`   Pending: $${balanceResult.data.pending || 0}`, 'blue');
    } else {
      log(`⚠️  Balance check: ${balanceResult.data.error || 'Not available'}`, 'yellow');
    }

    // Step 2: Get external accounts
    log('\n🏦 Step 2: Getting external accounts...', 'blue');
    const externalAccountsResult = await makeRequest('GET', `${API_BASE}/external-accounts/${accountId}`);

    if (externalAccountsResult.status === 200) {
      results.getExternalAccounts = true;
      log(`✅ External accounts retrieved`, 'green');
      const accounts = externalAccountsResult.data;
      if (accounts.bankAccounts && accounts.bankAccounts.length > 0) {
        log(`   Bank Accounts: ${accounts.bankAccounts.length}`, 'blue');
      }
      if (accounts.debitCards && accounts.debitCards.length > 0) {
        log(`   Debit Cards: ${accounts.debitCards.length}`, 'blue');
      }
    } else {
      log(`⚠️  External accounts: ${externalAccountsResult.data.error || 'Not available'}`, 'yellow');
    }

    // Step 3: Create account link (for adding payment methods)
    log('\n🔗 Step 3: Creating account link for onboarding...', 'blue');
    // For new accounts, use 'account_onboarding' instead of 'account_update'
    const accountLinkResult = await makeRequest('POST', `${API_BASE}/create-account-link`, {
      accountId: accountId,
      type: 'account_onboarding'
    });

    if (accountLinkResult.status === 200) {
      results.createAccountLink = true;
      if (accountLinkResult.data.url) {
        log(`✅ Account link created`, 'green');
        log(`   Link: ${accountLinkResult.data.url}`, 'blue');
      } else if (accountLinkResult.data.isTestAccount) {
        log(`✅ Test account handling (no link needed)`, 'green');
      }
    } else {
      log(`⚠️  Account link: ${accountLinkResult.data.error || 'Not available'}`, 'yellow');
    }

  } catch (error) {
    log(`❌ Error in Cashout workflow: ${error.message}`, 'red');
  }

  return results;
}

async function testBusinessSubscriptionWorkflow() {
  log('\n💼 Test 5: Business Subscription Workflow', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  const results = {
    createBusinessAccount: null,
    createSubscription: null,
    getSubscription: null,
    subscriptionId: null
  };

  try {
    // Step 1: Create business account
    log('\n📝 Step 1: Creating business account...', 'blue');
    const businessEmail = `business_${Date.now()}@test.com`;
    const businessResult = await makeRequest('POST', `${API_BASE}/create-account`, {
      userId: 'test_business_999',
      email: businessEmail,
      country: 'US',
      accountType: 'business',
      isBusinessAccount: true
    });

    if (businessResult.status === 200 && businessResult.data.success) {
      results.createBusinessAccount = businessResult.data.accountId;
      log(`✅ Business account created: ${results.createBusinessAccount}`, 'green');
      // Check for subscriptionId or subscription.id
      const subscriptionId = businessResult.data.subscriptionId || 
                            businessResult.data.subscription?.id;
      if (subscriptionId) {
        results.createSubscription = true;
        results.subscriptionId = subscriptionId;
        log(`✅ Subscription auto-created: ${results.subscriptionId}`, 'green');
        if (businessResult.data.subscription) {
          log(`   Status: ${businessResult.data.subscription.status}`, 'blue');
        }
      } else {
        // If subscription wasn't auto-created, try to create it manually
        log(`⚠️  Subscription not auto-created, attempting manual creation...`, 'yellow');
        try {
          const createSubResult = await makeRequest('POST', `${API_BASE}/create-subscription`, {
            userId: 'test_business_999',
            email: businessEmail,
            accountId: results.createBusinessAccount
          });
          
          if (createSubResult.status === 200 && createSubResult.data.subscriptionId) {
            results.createSubscription = true;
            results.subscriptionId = createSubResult.data.subscriptionId;
            log(`✅ Subscription created manually: ${results.subscriptionId}`, 'green');
          } else {
            log(`⚠️  Manual subscription creation failed: ${createSubResult.data.error || 'Unknown error'}`, 'yellow');
            // Still mark as passed if subscription status can be retrieved later
            results.createSubscription = false;
          }
        } catch (subError) {
          log(`⚠️  Error creating subscription: ${subError.message}`, 'yellow');
          results.createSubscription = false;
        }
      }
    } else {
      log(`⚠️  Business account: ${businessResult.data.error || 'Not fully created'}`, 'yellow');
      return results;
    }

    // Step 2: Get subscription status
    log('\n📊 Step 2: Getting subscription status...', 'blue');
    const subscriptionResult = await makeRequest('GET', `${API_BASE}/subscription/test_business_999`);

    if (subscriptionResult.status === 200) {
      results.getSubscription = true;
      log(`✅ Subscription status retrieved`, 'green');
      log(`   Status: ${subscriptionResult.data.status}`, 'blue');
      if (subscriptionResult.data.trialEnd) {
        // Handle both Unix timestamp and ISO string
        const trialEnd = typeof subscriptionResult.data.trialEnd === 'string' 
          ? new Date(subscriptionResult.data.trialEnd) 
          : new Date(subscriptionResult.data.trialEnd * 1000);
        if (!isNaN(trialEnd.getTime())) {
          log(`   Trial End: ${trialEnd.toLocaleString()}`, 'blue');
        }
      }
      // Use nextBillingDate if available, otherwise currentPeriodEnd
      const billingDate = subscriptionResult.data.nextBillingDate || subscriptionResult.data.currentPeriodEnd;
      if (billingDate) {
        // Handle both Unix timestamp and ISO string
        const periodEnd = typeof billingDate === 'string'
          ? new Date(billingDate)
          : new Date(billingDate * 1000);
        if (!isNaN(periodEnd.getTime())) {
          log(`   Next Billing: ${periodEnd.toLocaleString()}`, 'blue');
        }
      }
    } else {
      log(`⚠️  Subscription status: ${subscriptionResult.data.error || 'Not available'}`, 'yellow');
    }

  } catch (error) {
    log(`❌ Error in Business Subscription workflow: ${error.message}`, 'red');
  }

  return results;
}

async function runAllTests() {
  log('\n🚀 Comprehensive Payment Workflows Test', 'bold');
  log('══════════════════════════════════════════════════════════════', 'cyan');
  log(`Server: ${BASE_URL}`, 'blue');
  log(`Date: ${new Date().toLocaleString()}`, 'blue');
  log(`Test Mode: Using Stripe TEST keys`, 'blue');

  const allResults = {
    healthCheck: false,
    sendMoney: {},
    requestMoney: {},
    cashout: {},
    subscription: {}
  };

  // Test 1: Health Check
  allResults.healthCheck = await testHealthCheck();
  if (!allResults.healthCheck) {
    log('\n⚠️  Server is not running. Start it with: npm run server:dev', 'yellow');
    return;
  }

  // Test 2: Send Money Workflow
  allResults.sendMoney = await testSendMoneyWorkflow();

  // Test 3: Request Money Workflow
  allResults.requestMoney = await testRequestMoneyWorkflow();

  // Test 4: Cashout Workflow
  allResults.cashout = await testCashoutWorkflow();

  // Test 5: Business Subscription Workflow
  allResults.subscription = await testBusinessSubscriptionWorkflow();

  // Final Summary
  log('\n' + '═'.repeat(60), 'cyan');
  log('📊 FINAL TEST SUMMARY', 'bold');
  log('═'.repeat(60), 'cyan');

  log('\n✅ Health Check:', allResults.healthCheck ? 'PASSED' : 'FAILED', allResults.healthCheck ? 'green' : 'red');

  log('\n💵 Send Money Workflow:');
  log(`  Create Sender Account: ${allResults.sendMoney.createSenderAccount ? '✅' : '❌'}`, 
      allResults.sendMoney.createSenderAccount ? 'green' : 'red');
  log(`  Create Recipient Account: ${allResults.sendMoney.createRecipientAccount ? '✅' : '❌'}`, 
      allResults.sendMoney.createRecipientAccount ? 'green' : 'red');
  log(`  Create Payment Intent: ${allResults.sendMoney.createPaymentIntent ? '✅' : '❌'}`, 
      allResults.sendMoney.createPaymentIntent ? 'green' : 'red');

  log('\n📤 Request Money Workflow:');
  log(`  Create Requestor Account: ${allResults.requestMoney.createRequestorAccount ? '✅' : '❌'}`, 
      allResults.requestMoney.createRequestorAccount ? 'green' : 'red');
  log(`  Create Payment Request: ${allResults.requestMoney.createPaymentRequest ? '✅' : '❌'}`, 
      allResults.requestMoney.createPaymentRequest ? 'green' : 'red');

  log('\n💰 Cashout Workflow:');
  log(`  Create Account: ${allResults.cashout.createAccount ? '✅' : '⚠️'}`, 
      allResults.cashout.createAccount ? 'green' : 'yellow');
  log(`  Get Balance: ${allResults.cashout.getBalance ? '✅' : '⚠️'}`, 
      allResults.cashout.getBalance ? 'green' : 'yellow');
  log(`  Get External Accounts: ${allResults.cashout.getExternalAccounts ? '✅' : '⚠️'}`, 
      allResults.cashout.getExternalAccounts ? 'green' : 'yellow');
  log(`  Create Account Link: ${allResults.cashout.createAccountLink ? '✅' : '⚠️'}`, 
      allResults.cashout.createAccountLink ? 'green' : 'yellow');

  log('\n💼 Business Subscription Workflow:');
  log(`  Create Business Account: ${allResults.subscription.createBusinessAccount ? '✅' : '❌'}`, 
      allResults.subscription.createBusinessAccount ? 'green' : 'red');
  log(`  Create Subscription: ${allResults.subscription.createSubscription ? '✅' : '⚠️'}`, 
      allResults.subscription.createSubscription ? 'green' : 'yellow');
  log(`  Get Subscription Status: ${allResults.subscription.getSubscription ? '✅' : '⚠️'}`, 
      allResults.subscription.getSubscription ? 'green' : 'yellow');

  // Calculate pass rate
  const totalTests = 13;
  let passedTests = 0;
  if (allResults.healthCheck) passedTests++;
  if (allResults.sendMoney.createSenderAccount) passedTests++;
  if (allResults.sendMoney.createRecipientAccount) passedTests++;
  if (allResults.sendMoney.createPaymentIntent) passedTests++;
  if (allResults.requestMoney.createRequestorAccount) passedTests++;
  if (allResults.requestMoney.createPaymentRequest) passedTests++;
  if (allResults.cashout.createAccount) passedTests++;
  if (allResults.cashout.getBalance) passedTests++;
  if (allResults.cashout.getExternalAccounts) passedTests++;
  if (allResults.cashout.createAccountLink) passedTests++;
  if (allResults.subscription.createBusinessAccount) passedTests++;
  if (allResults.subscription.createSubscription) passedTests++;
  if (allResults.subscription.getSubscription) passedTests++;

  log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`, 
      passedTests === totalTests ? 'green' : passedTests >= totalTests * 0.8 ? 'yellow' : 'red');

  log('\n💡 Next Steps:', 'cyan');
  log('   1. Test with test cards in UI: 4242 4242 4242 4242', 'blue');
  log('   2. Complete account onboarding for transfers', 'blue');
  log('   3. Test actual payment processing', 'blue');
  log('   4. Test cashout to external accounts', 'blue');
  log('\n');
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});


