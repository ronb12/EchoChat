/**
 * Check Production Mode Status
 * Verifies if app is configured for production
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const results = {
  production: [],
  development: [],
  warnings: []
};

function checkFile(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (error) {
    return null;
  }
  return null;
}

function checkStripeKeys() {
  console.log('\n💳 Checking Stripe Keys...');
  console.log('─'.repeat(70));
  
  const env = checkFile('.env');
  const serverEnv = checkFile('server/.env');
  
  let frontendKey = '';
  let backendKey = '';
  
  if (env) {
    const pubMatch = env.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
    if (pubMatch) frontendKey = pubMatch[1].trim();
  }
  
  if (serverEnv) {
    const secMatch = serverEnv.match(/STRIPE_SECRET_KEY=(.+)/);
    if (secMatch) backendKey = secMatch[1].trim();
  }
  
  if (frontendKey.startsWith('pk_live_')) {
    results.production.push('✅ Frontend Stripe Key: LIVE mode');
  } else if (frontendKey.startsWith('pk_test_')) {
    results.development.push('⚠️  Frontend Stripe Key: TEST mode (needs LIVE for production)');
  } else {
    results.warnings.push('⚠️  Frontend Stripe Key: Not found');
  }
  
  if (backendKey.startsWith('sk_live_')) {
    results.production.push('✅ Backend Stripe Key: LIVE mode');
  } else if (backendKey.startsWith('sk_test_')) {
    results.development.push('⚠️  Backend Stripe Key: TEST mode (needs LIVE for production)');
  } else {
    results.warnings.push('⚠️  Backend Stripe Key: Not found');
  }
}

function checkAPIURL() {
  console.log('\n🌐 Checking API URL...');
  console.log('─'.repeat(70));
  
  const env = checkFile('.env');
  let apiUrl = '';
  
  if (env) {
    const match = env.match(/VITE_API_BASE_URL=(.+)/);
    if (match) apiUrl = match[1].trim();
  }
  
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    results.development.push('⚠️  API URL: Points to localhost (needs production URL)');
  } else if (apiUrl.includes('echochat-messaging.web.app') || apiUrl.includes('cloudfunctions.net')) {
    results.production.push('✅ API URL: Points to production');
  } else if (apiUrl) {
    results.production.push(`✅ API URL: Set to ${apiUrl}`);
  } else {
    results.warnings.push('⚠️  API URL: Not set (will use Firebase Functions automatic routing)');
  }
}

function checkBuildMode() {
  console.log('\n🏗️  Checking Build Configuration...');
  console.log('─'.repeat(70));
  
  const distExists = fs.existsSync('dist');
  if (distExists) {
    const distFiles = fs.readdirSync('dist');
    if (distFiles.length > 0) {
      results.production.push('✅ Production build exists (dist/ directory)');
    } else {
      results.warnings.push('⚠️  dist/ directory is empty');
    }
  } else {
    results.development.push('⚠️  No production build found (run: npm run build)');
  }
  
  const viteConfig = checkFile('vite.config.js');
  if (viteConfig && viteConfig.includes('production')) {
    results.production.push('✅ Vite configured for production builds');
  }
}

function checkFirebaseConfig() {
  console.log('\n🔥 Checking Firebase Configuration...');
  console.log('─'.repeat(70));
  
  const firebaseJson = checkFile('firebase.json');
  if (firebaseJson) {
    results.production.push('✅ Firebase configuration present');
    
    if (firebaseJson.includes('functions')) {
      results.production.push('✅ Firebase Functions configured');
    }
    
    if (firebaseJson.includes('/api/**')) {
      results.production.push('✅ API routing configured');
    }
  } else {
    results.warnings.push('⚠️  firebase.json not found');
  }
}

function checkEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...');
  console.log('─'.repeat(70));
  
  const prodExample = fs.existsSync('.env.production.example');
  if (prodExample) {
    results.production.push('✅ Production environment template exists');
  }
  
  const envExample = fs.existsSync('env.example') || fs.existsSync('.env.example');
  if (envExample) {
    results.production.push('✅ Environment example exists');
  }
}

function checkFunctionsConfig() {
  console.log('\n⚙️  Checking Functions Configuration...');
  console.log('─'.repeat(70));
  
  const functionsIndex = checkFile('functions/index.js');
  if (functionsIndex) {
    results.production.push('✅ EchoChat API (Functions) code present');
    
    if (functionsIndex.includes('production')) {
      results.production.push('✅ Functions code includes production checks');
    }
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(70), BOLD);
  console.log('📊 PRODUCTION MODE STATUS REPORT', BOLD);
  console.log('='.repeat(70) + '\n', BOLD);
  
  const totalChecks = results.production.length + results.development.length + results.warnings.length;
  const productionScore = (results.production.length / totalChecks) * 100;
  
  if (productionScore >= 80) {
    console.log('🎯 Status: ', GREEN + BOLD, '✅ PRODUCTION READY', RESET);
  } else if (productionScore >= 50) {
    console.log('🎯 Status: ', YELLOW + BOLD, '⚠️  PARTIALLY READY', RESET);
  } else {
    console.log('🎯 Status: ', RED + BOLD, '❌ DEVELOPMENT MODE', RESET);
  }
  
  console.log(`\n📈 Production Readiness: ${productionScore.toFixed(1)}%`, 
    productionScore >= 80 ? GREEN : productionScore >= 50 ? YELLOW : RED);
  
  if (results.production.length > 0) {
    console.log(`\n✅ Production Indicators (${results.production.length}):`, GREEN);
    results.production.forEach(item => console.log(`   ${item}`, GREEN));
  }
  
  if (results.development.length > 0) {
    console.log(`\n⚠️  Development Indicators (${results.development.length}):`, YELLOW);
    results.development.forEach(item => console.log(`   ${item}`, YELLOW));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${results.warnings.length}):`, YELLOW);
    results.warnings.forEach(item => console.log(`   ${item}`, YELLOW));
  }
  
  console.log('\n' + '='.repeat(70), BOLD);
  
  // Specific recommendations
  if (results.development.length > 0) {
    console.log('\n📋 To Switch to Production:', BLUE + BOLD);
    console.log('─'.repeat(70), BLUE);
    
    if (results.development.some(d => d.includes('TEST mode'))) {
      console.log('1. Get Stripe LIVE keys from: https://dashboard.stripe.com/apikeys', BLUE);
      console.log('2. Update .env with LIVE keys (pk_live_... and sk_live_...)', BLUE);
    }
    
    if (results.development.some(d => d.includes('localhost'))) {
      console.log('3. Update VITE_API_BASE_URL to production backend URL', BLUE);
    }
    
    if (results.development.some(d => d.includes('production build'))) {
      console.log('4. Build for production: npm run build', BLUE);
    }
    
    console.log('5. Deploy: firebase deploy', BLUE);
    console.log('─'.repeat(70) + '\n', BLUE);
  }
  
  console.log('='.repeat(70) + '\n', BOLD);
}

// Run checks
console.log(BOLD + '🔍 Checking Production Mode Status...' + RESET);

checkStripeKeys();
checkAPIURL();
checkBuildMode();
checkFirebaseConfig();
checkEnvironmentVariables();
checkFunctionsConfig();

generateReport();


