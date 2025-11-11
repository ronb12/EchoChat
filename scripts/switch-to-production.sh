#!/bin/bash

# Switch to Production Mode Script
# This script helps configure the app for production deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Switching EchoChat to Production Mode                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found. Creating from template...${NC}"
    cp .env.production.example .env.production 2>/dev/null || {
        echo -e "${RED}❌ .env.production.example not found. Creating new file...${NC}"
        cat > .env.production << 'EOF'
# Production Environment Variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
VITE_API_BASE_URL=https://echochat-messaging.web.app
NODE_ENV=production
EOF
    }
fi

echo -e "${GREEN}✅ Production environment file ready${NC}"
echo ""

# Prompt for LIVE keys
echo -e "${YELLOW}📋 Please provide your Stripe LIVE keys:${NC}"
echo -e "${BLUE}   Get them from: https://dashboard.stripe.com/apikeys${NC}"
echo ""

read -p "Enter LIVE Publishable Key (pk_live_...): " LIVE_PUB_KEY
read -p "Enter LIVE Secret Key (sk_live_...): " LIVE_SEC_KEY

if [ -z "$LIVE_PUB_KEY" ] || [ -z "$LIVE_SEC_KEY" ]; then
    echo -e "${RED}❌ Keys cannot be empty. Exiting...${NC}"
    exit 1
fi

# Validate keys
if [[ ! "$LIVE_PUB_KEY" =~ ^pk_live_ ]]; then
    echo -e "${RED}❌ Invalid publishable key format. Must start with 'pk_live_'${NC}"
    exit 1
fi

if [[ ! "$LIVE_SEC_KEY" =~ ^sk_live_ ]]; then
    echo -e "${RED}❌ Invalid secret key format. Must start with 'sk_live_'${NC}"
    exit 1
fi

# Update .env.production
echo ""
echo -e "${BLUE}📝 Updating .env.production...${NC}"
sed -i.bak "s|VITE_STRIPE_PUBLISHABLE_KEY=.*|VITE_STRIPE_PUBLISHABLE_KEY=$LIVE_PUB_KEY|" .env.production
sed -i.bak "s|STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$LIVE_SEC_KEY|" .env.production

# Set production API URL
sed -i.bak "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=https://echochat-messaging.web.app|" .env.production
sed -i.bak "s|NODE_ENV=.*|NODE_ENV=production|" .env.production

echo -e "${GREEN}✅ .env.production updated${NC}"

# Update functions/.env if it exists
if [ -f "functions/.env" ]; then
    echo -e "${BLUE}📝 Updating functions/.env...${NC}"
    sed -i.bak "s|STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$LIVE_SEC_KEY|" functions/.env
    echo -e "${GREEN}✅ functions/.env updated${NC}"
else
    echo -e "${YELLOW}⚠️  functions/.env not found. Creating...${NC}"
    cat > functions/.env << EOF
STRIPE_SECRET_KEY=$LIVE_SEC_KEY
NODE_ENV=production
EOF
    echo -e "${GREEN}✅ functions/.env created${NC}"
fi

# Configure Firebase Functions
echo ""
echo -e "${BLUE}🔥 Configuring Firebase Functions...${NC}"
echo -e "${YELLOW}   This will set the Stripe secret key in Firebase Functions config${NC}"
read -p "Configure Firebase Functions now? (y/n): " CONFIGURE_FIREBASE

if [ "$CONFIGURE_FIREBASE" = "y" ] || [ "$CONFIGURE_FIREBASE" = "Y" ]; then
    echo ""
    echo -e "${BLUE}Running: firebase functions:config:set stripe.secret_key=\"$LIVE_SEC_KEY\"${NC}"
    firebase functions:config:set stripe.secret_key="$LIVE_SEC_KEY" || {
        echo -e "${RED}❌ Failed to set Firebase Functions config${NC}"
        echo -e "${YELLOW}   You can set it manually later with:${NC}"
        echo -e "${BLUE}   firebase functions:config:set stripe.secret_key=\"$LIVE_SEC_KEY\"${NC}"
    }
    echo -e "${GREEN}✅ Firebase Functions configured${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping Firebase Functions configuration${NC}"
    echo -e "${YELLOW}   Set it manually with:${NC}"
    echo -e "${BLUE}   firebase functions:config:set stripe.secret_key=\"$LIVE_SEC_KEY\"${NC}"
fi

# Clean up backup files
rm -f .env.production.bak functions/.env.bak 2>/dev/null

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Production Mode Configured!                   ║${NC}"
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
echo -e "3. ${YELLOW}Configure Stripe Webhooks:${NC}"
echo -e "   ${BLUE}Webhook URL: https://echochat-messaging.web.app/api/stripe/webhook${NC}"
echo -e "   ${BLUE}Get webhook secret from Stripe Dashboard${NC}"
echo ""
echo -e "${GREEN}✅ Your app is now configured for production!${NC}"
echo ""


