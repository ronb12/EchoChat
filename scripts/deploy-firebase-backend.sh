#!/bin/bash

# Complete Firebase Backend Deployment Script
# Deploys backend within Firebase Functions - no separate hosting needed!

set -e

echo "🚀 Deploying EchoChat Backend to Firebase Functions"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing Functions Dependencies${NC}"
cd functions
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi
cd ..

# Step 2: Get Stripe keys
echo ""
echo -e "${BLUE}Step 2: Configure Stripe Keys${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Enter Stripe Secret Key (sk_live_... or sk_test_...): " STRIPE_SECRET_KEY
read -p "Enter Stripe Webhook Secret (whsec_...): " WEBHOOK_SECRET

if [[ ! $STRIPE_SECRET_KEY =~ ^sk_ ]]; then
    echo -e "${RED}❌ Invalid Stripe secret key${NC}"
    exit 1
fi

# Step 3: Set Firebase Functions config
echo ""
echo -e "${BLUE}Step 3: Setting Firebase Functions Configuration${NC}"

firebase functions:config:set stripe.secret_key="$STRIPE_SECRET_KEY" || echo "Config may already be set"
firebase functions:config:set stripe.webhook_secret="$WEBHOOK_SECRET" || echo "Config may already be set"
firebase functions:config:set app.frontend_url="https://echochat-messaging.web.app" || echo "Config may already be set"

echo -e "${GREEN}✅ Configuration set${NC}"

# Step 4: Deploy functions
echo ""
echo -e "${BLUE}Step 4: Deploying Functions${NC}"
echo "This may take a few minutes..."

firebase deploy --only functions

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ BACKEND DEPLOYED!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Your backend is now available at:"
echo "   https://echochat-messaging.web.app/api/*"
echo ""
echo "✅ No separate hosting needed!"
echo "✅ Everything runs in Firebase!"
echo ""
echo "🧪 Next Steps:"
echo "1. Update frontend to use: VITE_API_BASE_URL=https://echochat-messaging.web.app"
echo "2. Configure Stripe webhooks to point to your function URL"
echo "3. Deploy frontend: npm run deploy"
echo ""


