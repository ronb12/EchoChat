#!/bin/bash

# Apply LIVE Stripe Keys to Production Configuration
# This script updates .env.production and functions/.env with LIVE keys

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Applying LIVE Stripe Keys to Production             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if LIVE keys are provided as arguments
if [ $# -eq 2 ]; then
    LIVE_PUB_KEY=$1
    LIVE_SEC_KEY=$2
else
    echo -e "${YELLOW}📋 Please provide your LIVE Stripe keys:${NC}"
    echo -e "${BLUE}   Get them from: https://dashboard.stripe.com/apikeys${NC}"
    echo -e "${BLUE}   (Switch to LIVE mode in Stripe Dashboard)${NC}"
    echo ""
    read -p "Enter LIVE Publishable Key (pk_live_...): " LIVE_PUB_KEY
    read -p "Enter LIVE Secret Key (sk_live_...): " LIVE_SEC_KEY
fi

# Validate keys
if [ -z "$LIVE_PUB_KEY" ] || [ -z "$LIVE_SEC_KEY" ]; then
    echo -e "${RED}❌ Keys cannot be empty. Exiting...${NC}"
    exit 1
fi

if [[ ! "$LIVE_PUB_KEY" =~ ^pk_live_ ]]; then
    echo -e "${RED}❌ Invalid publishable key format. Must start with 'pk_live_'${NC}"
    exit 1
fi

if [[ ! "$LIVE_SEC_KEY" =~ ^sk_live_ ]]; then
    echo -e "${RED}❌ Invalid secret key format. Must start with 'sk_live_'${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Keys validated${NC}"
echo ""

# Update .env.production
echo -e "${BLUE}📝 Updating .env.production...${NC}"
if [ ! -f ".env.production" ]; then
    cat > .env.production << EOF
# Production Environment Variables
# Generated: $(date)

VITE_STRIPE_PUBLISHABLE_KEY=$LIVE_PUB_KEY
VITE_API_BASE_URL=https://echochat-messaging.web.app
NODE_ENV=production
EOF
else
    # Update existing file
    sed -i.bak "s|VITE_STRIPE_PUBLISHABLE_KEY=.*|VITE_STRIPE_PUBLISHABLE_KEY=$LIVE_PUB_KEY|" .env.production
    sed -i.bak "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=https://echochat-messaging.web.app|" .env.production
    sed -i.bak "s|NODE_ENV=.*|NODE_ENV=production|" .env.production
fi
rm -f .env.production.bak 2>/dev/null
echo -e "${GREEN}✅ .env.production updated${NC}"

# Create/update functions/.env
echo -e "${BLUE}📝 Updating functions/.env...${NC}"
if [ ! -f "functions/.env" ]; then
    mkdir -p functions
    cat > functions/.env << EOF
# Firebase Functions Environment Variables
# Generated: $(date)

STRIPE_SECRET_KEY=$LIVE_SEC_KEY
NODE_ENV=production
EOF
else
    sed -i.bak "s|STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$LIVE_SEC_KEY|" functions/.env
    sed -i.bak "s|NODE_ENV=.*|NODE_ENV=production|" functions/.env
fi
rm -f functions/.env.bak 2>/dev/null
echo -e "${GREEN}✅ functions/.env updated${NC}"

# Note about Firebase Functions config
echo ""
echo -e "${YELLOW}⚠️  Note: Firebase Functions config is deprecated${NC}"
echo -e "${BLUE}   Use functions/.env instead (already configured above)${NC}"
echo ""

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ LIVE Keys Applied Successfully!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Build for production:${NC}"
echo -e "   ${BLUE}npm run build${NC}"
echo ""
echo -e "2. ${YELLOW}Deploy to Firebase:${NC}"
echo -e "   ${BLUE}firebase deploy${NC}"
echo ""
echo -e "3. ${YELLOW}Verify:${NC}"
echo -e "   ${BLUE}npm run stripe:check${NC}"
echo -e "   Should show: ${GREEN}Mode: LIVE${NC}"
echo ""
echo -e "${GREEN}✅ Your app is now configured for production!${NC}"
echo ""


