#!/usr/bin/env node

/**
 * Script to switch Stripe between test and live modes
 * 
 * Usage:
 *   node scripts/switch-stripe-mode.js test    # Switch to test mode
 *   node scripts/switch-stripe-mode.js live     # Switch to live mode
 *   node scripts/switch-stripe-mode.js check   # Check current mode
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const SERVER_ENV_FILE = path.join(ROOT_DIR, 'server', '.env');
const ENV_EXAMPLE = path.join(ROOT_DIR, 'env.example');

// Colors for console output
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

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function writeEnvFile(filePath, env) {
  const lines = [];
  
  // Read original file to preserve comments and order
  if (fs.existsSync(filePath)) {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const originalLines = originalContent.split('\n');
    
    originalLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key] = trimmed.split('=');
        if (key && env[key.trim()]) {
          lines.push(`${key.trim()}=${env[key.trim()]}`);
        } else {
          lines.push(line);
        }
      } else {
        lines.push(line);
      }
    });
  } else {
    // Create new file
    Object.keys(env).forEach(key => {
      lines.push(`${key}=${env[key]}`);
    });
  }
  
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function detectMode(key) {
  if (!key) return null;
  if (key.startsWith('pk_live_') || key.startsWith('sk_live_')) return 'live';
  if (key.startsWith('pk_test_') || key.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

function checkCurrentMode() {
  log('\n🔍 Checking Stripe Configuration...', 'cyan');
  
  const rootEnv = readEnvFile(ENV_FILE);
  const serverEnv = readEnvFile(SERVER_ENV_FILE);
  
  const publishableKey = rootEnv?.VITE_STRIPE_PUBLISHABLE_KEY;
  const secretKey = serverEnv?.STRIPE_SECRET_KEY || rootEnv?.VITE_STRIPE_SECRET_KEY;
  
  const publishableMode = detectMode(publishableKey);
  const secretMode = detectMode(secretKey);
  
  log('\n📋 Current Configuration:', 'bold');
  console.log(`   Frontend (.env):`);
  console.log(`     VITE_STRIPE_PUBLISHABLE_KEY: ${publishableKey ? publishableMode.toUpperCase() : 'NOT SET'}`);
  if (publishableKey) {
    const masked = publishableKey.substring(0, 12) + '...' + publishableKey.substring(publishableKey.length - 4);
    console.log(`     Key: ${masked}`);
  }
  
  console.log(`   Backend (server/.env):`);
  console.log(`     STRIPE_SECRET_KEY: ${secretKey ? secretMode.toUpperCase() : 'NOT SET'}`);
  if (secretKey) {
    const masked = secretKey.substring(0, 12) + '...' + secretKey.substring(secretKey.length - 4);
    console.log(`     Key: ${masked}`);
  }
  
  if (publishableMode && secretMode) {
    if (publishableMode === secretMode) {
      log(`\n✅ Mode: ${publishableMode.toUpperCase()}`, publishableMode === 'live' ? 'red' : 'green');
    } else {
      log(`\n⚠️  WARNING: Mode mismatch!`, 'yellow');
      log(`   Frontend: ${publishableMode.toUpperCase()}`, 'yellow');
      log(`   Backend: ${secretMode.toUpperCase()}`, 'yellow');
    }
  } else {
    log(`\n⚠️  Configuration incomplete`, 'yellow');
  }
  
  return { publishableMode, secretMode };
}

function switchMode(targetMode) {
  log(`\n🔄 Switching to ${targetMode.toUpperCase()} mode...`, 'cyan');
  
  const rootEnv = readEnvFile(ENV_FILE) || {};
  const serverEnv = readEnvFile(SERVER_ENV_FILE) || {};
  
  const currentPublishable = rootEnv.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const currentSecret = serverEnv.STRIPE_SECRET_KEY || rootEnv.VITE_STRIPE_SECRET_KEY || '';
  
  // Check if keys need to be changed
  const currentPublishableMode = detectMode(currentPublishable);
  const currentSecretMode = detectMode(currentSecret);
  
  if (currentPublishableMode === targetMode && currentSecretMode === targetMode) {
    log(`\n✅ Already in ${targetMode.toUpperCase()} mode`, 'green');
    return;
  }
  
  log(`\n⚠️  WARNING: This will modify your .env files!`, 'yellow');
  log(`   Current: Frontend=${currentPublishableMode || 'N/A'}, Backend=${currentSecretMode || 'N/A'}`, 'yellow');
  log(`   Target: ${targetMode.toUpperCase()}`, 'yellow');
  log(`\n   You will need to provide ${targetMode} keys.`, 'yellow');
  log(`   Please update your .env files manually with ${targetMode} keys.`, 'yellow');
  log(`\n   For ${targetMode} mode, use:`, 'cyan');
  log(`   - Frontend: VITE_STRIPE_PUBLISHABLE_KEY=pk_${targetMode}_...`, 'cyan');
  log(`   - Backend: STRIPE_SECRET_KEY=sk_${targetMode}_...`, 'cyan');
  
  log(`\n📝 Instructions:`, 'bold');
  log(`   1. Get your ${targetMode} keys from: https://dashboard.stripe.com/apikeys`, 'blue');
  log(`   2. Update ${ENV_FILE} with pk_${targetMode}_...`, 'blue');
  log(`   3. Update ${SERVER_ENV_FILE} with sk_${targetMode}_...`, 'blue');
  log(`   4. Restart your development server`, 'blue');
}

// Main
const mode = process.argv[2];

if (!mode || mode === 'help' || mode === '--help' || mode === '-h') {
  log('\n📚 Stripe Mode Switcher', 'bold');
  log('\nUsage:', 'cyan');
  log('  node scripts/switch-stripe-mode.js check   # Check current mode');
  log('  node scripts/switch-stripe-mode.js test    # Show instructions to switch to test');
  log('  node scripts/switch-stripe-mode.js live    # Show instructions to switch to live');
  log('\nNote: This script provides instructions but does not modify keys automatically', 'yellow');
  log('      for security reasons. You must manually update your .env files.', 'yellow');
  process.exit(0);
}

if (mode === 'check') {
  checkCurrentMode();
} else if (mode === 'test' || mode === 'live') {
  switchMode(mode);
} else {
  log(`\n❌ Invalid mode: ${mode}`, 'red');
  log('   Use: check, test, or live', 'yellow');
  process.exit(1);
}

