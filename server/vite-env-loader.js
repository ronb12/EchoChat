/**
 * Vite-compatible environment variable loader for backend
 * Loads environment variables with proper Vite prefix handling
 */

import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Load environment variables from .env files
 * Supports both VITE_ prefixed and standard variables
 */
export function loadEnv(mode = process.env.NODE_ENV || 'development') {
  const root = process.cwd();
  const envFiles = [
    `.env.${mode}.local`,
    `.env.${mode}`,
    `.env.local`,
    `.env`,
  ];

  const env = {};
  
  for (const file of envFiles) {
    const envPath = resolve(root, file);
    if (existsSync(envPath)) {
      const result = config({ path: envPath });
      if (result.parsed) {
        Object.assign(env, result.parsed);
      }
    }
  }

  // Also check server/.env
  const serverEnvPath = resolve(root, 'server', '.env');
  if (existsSync(serverEnvPath)) {
    const result = config({ path: serverEnvPath });
    if (result.parsed) {
      Object.assign(env, result.parsed);
    }
  }

  // Process VITE_ prefixed variables (make them available as non-prefixed)
  const processedEnv = {};
  for (const key in env) {
    if (key.startsWith('VITE_')) {
      // Remove VITE_ prefix for backend use
      const backendKey = key.replace(/^VITE_/, '');
      processedEnv[backendKey] = env[key];
      // Also keep the original for compatibility
      processedEnv[key] = env[key];
    } else {
      processedEnv[key] = env[key];
    }
  }

  // Set on process.env
  for (const key in processedEnv) {
    if (!process.env[key]) {
      process.env[key] = processedEnv[key];
    }
  }

  return processedEnv;
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key, defaultValue = null) {
  // Try VITE_ prefix first, then direct key
  return process.env[`VITE_${key}`] || process.env[key] || defaultValue;
}

/**
 * Validate required environment variables
 */
export function validateEnv(requiredVars = []) {
  const missing = [];
  const warnings = [];

  for (const varName of requiredVars) {
    const value = getEnv(varName);
    if (!value) {
      missing.push(varName);
    }
  }

  // Check for production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    const stripeKey = getEnv('STRIPE_SECRET_KEY');
    if (stripeKey && stripeKey.startsWith('sk_test_')) {
      warnings.push('Using TEST Stripe keys in PRODUCTION!');
    }
    
    const apiUrl = getEnv('VITE_API_BASE_URL');
    if (!apiUrl || apiUrl.includes('localhost')) {
      warnings.push('VITE_API_BASE_URL not set or points to localhost in production');
    }
  }

  return { missing, warnings };
}


