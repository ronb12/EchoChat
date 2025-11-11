#!/bin/bash

# Production Environment Setup Script
# Guides user through setting up production environment variables

set -e

echo "🔧 EchoChat Production Environment Setup"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}This script will help you set up production environment variables${NC}"
echo ""

# Get Stripe LIVE keys
echo -e "${YELLOW}Step 1: Stripe LIVE Keys${NC}"
echo "1. Go to https://dashboard.stripe.com/apikeys"
echo "2. Switch to LIVE mode (toggle in top right)"
echo "3. Copy your LIVE keys"
echo ""
read -p "Enter Stripe Publishable Key (pk_live_...): " STRIPE_PUB_KEY
read -p "Enter Stripe Secret Key (sk_live_...): " STRIPE_SEC_KEY

if [[ ! $STRIPE_PUB_KEY =~ ^pk_live_ ]] || [[ ! $STRIPE_SEC_KEY =~ ^sk_live_ ]]; then
    echo -e "${RED}❌ Invalid LIVE keys. Keys must start with pk_live_ and sk_live_${NC}"
    exit 1
fi

# Get backend URL
echo ""
echo -e "${YELLOW}Step 2: Backend URL${NC}"
echo "Enter your production backend URL (e.g., https://echochat-backend.railway.app)"
read -p "Backend URL: " BACKEND_URL

if [[ ! $BACKEND_URL =~ ^https?:// ]]; then
    echo -e "${RED}❌ Invalid URL format. Must start with http:// or https://${NC}"
    exit 1
fi

# Get webhook secret (optional)
echo ""
echo -e "${YELLOW}Step 3: Stripe Webhook Secret (optional)${NC}"
echo "After configuring webhook in Stripe Dashboard, enter the signing secret"
read -p "Webhook Secret (whsec_...): " WEBHOOK_SECRET

# Create .env.production file
echo ""
echo -e "${YELLOW}Creating .env.production file...${NC}"

cat > .env.production << EOF
# Production Environment Variables
# Generated on $(date)

# Stripe LIVE Keys
VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUB_KEY
STRIPE_SECRET_KEY=$STRIPE_SEC_KEY

# Backend API URL
VITE_API_BASE_URL=$BACKEND_URL

# CORS Configuration
CORS_ORIGIN=https://echochat-messaging.web.app,https://echochat-messaging.firebaseapp.com

# Frontend URL
FRONTEND_URL=https://echochat-messaging.web.app

# Node Environment
NODE_ENV=production

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
EOF

# Create server/.env.production
echo ""
echo -e "${YELLOW}Creating server/.env.production file...${NC}"

cat > server/.env.production << EOF
# Production Backend Environment Variables
# Generated on $(date)

# Stripe LIVE Secret Key
STRIPE_SECRET_KEY=$STRIPE_SEC_KEY

# CORS Configuration
CORS_ORIGIN=https://echochat-messaging.web.app,https://echochat-messaging.firebaseapp.com

# Frontend URL
FRONTEND_URL=https://echochat-messaging.web.app

# Node Environment
NODE_ENV=production

# Port
PORT=3001

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
EOF

echo ""
echo -e "${GREEN}✅ Environment files created!${NC}"
echo ""
echo "Files created:"
echo "  - .env.production (frontend)"
echo "  - server/.env.production (backend)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the .env.production files"
echo "2. Set these variables on your hosting platform"
echo "3. Build frontend: npm run build"
echo "4. Deploy backend using the deployment script"
echo ""


