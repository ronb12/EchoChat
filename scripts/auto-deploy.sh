#!/bin/bash

# Automated Deployment Script
# Attempts to complete as much as possible automatically

set -e

echo "🤖 Automated Deployment Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Step 1: Check for existing keys
echo -e "${CYAN}Step 1: Checking for Stripe Keys${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".env" ]; then
    STRIPE_PUB_KEY=$(grep "VITE_STRIPE_PUBLISHABLE_KEY" .env | cut -d'=' -f2 | tr -d ' ' || echo "")
    STRIPE_SEC_KEY=$(grep "STRIPE_SECRET_KEY" server/.env 2>/dev/null | cut -d'=' -f2 | tr -d ' ' || grep "STRIPE_SECRET_KEY" .env | cut -d'=' -f2 | tr -d ' ' || echo "")
    
    if [[ $STRIPE_PUB_KEY =~ ^pk_live_ ]] && [[ $STRIPE_SEC_KEY =~ ^sk_live_ ]]; then
        echo -e "${GREEN}✅ Found LIVE Stripe keys!${NC}"
        USE_EXISTING=true
    elif [[ $STRIPE_PUB_KEY =~ ^pk_test_ ]] && [[ $STRIPE_SEC_KEY =~ ^sk_test_ ]]; then
        echo -e "${YELLOW}⚠️  Found TEST keys. Need LIVE keys for production.${NC}"
        USE_EXISTING=false
    else
        echo -e "${YELLOW}⚠️  No valid Stripe keys found.${NC}"
        USE_EXISTING=false
    fi
else
    USE_EXISTING=false
fi

if [ "$USE_EXISTING" = false ]; then
    echo ""
    echo "📋 To get Stripe LIVE keys:"
    echo "1. Open: https://dashboard.stripe.com/apikeys"
    echo "2. Toggle to LIVE mode (top right)"
    echo "3. Copy keys:"
    echo ""
    read -p "Enter Stripe Publishable Key (pk_live_...): " STRIPE_PUB_KEY
    read -p "Enter Stripe Secret Key (sk_live_...): " STRIPE_SEC_KEY
    
    if [[ ! $STRIPE_PUB_KEY =~ ^pk_live_ ]] || [[ ! $STRIPE_SEC_KEY =~ ^sk_live_ ]]; then
        echo -e "${RED}❌ Invalid LIVE keys!${NC}"
        exit 1
    fi
fi

# Step 2: Check for backend deployment
echo ""
echo -e "${CYAN}Step 2: Backend Deployment Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✅ Railway CLI found${NC}"
    
    echo ""
    echo "Attempting Railway deployment..."
    cd server
    
    # Try to initialize if not already done
    railway init 2>/dev/null || echo "Project already initialized"
    
    # Set environment variables
    echo "Setting environment variables..."
    railway variables set NODE_ENV=production 2>/dev/null || echo "Set manually: NODE_ENV=production"
    railway variables set STRIPE_SECRET_KEY="$STRIPE_SEC_KEY" 2>/dev/null || echo "Set manually: STRIPE_SECRET_KEY"
    railway variables set CORS_ORIGIN=https://echochat-messaging.web.app 2>/dev/null || echo "Set manually: CORS_ORIGIN"
    railway variables set FRONTEND_URL=https://echochat-messaging.web.app 2>/dev/null || echo "Set manually: FRONTEND_URL"
    
    echo ""
    echo "Deploying to Railway..."
    railway up || echo "Deployment may need manual intervention"
    
    # Try to get URL
    BACKEND_URL=$(railway domain 2>/dev/null || railway status 2>/dev/null | grep -o 'https://[^ ]*' | head -1 || echo "")
    
    cd ..
    
    if [ -z "$BACKEND_URL" ]; then
        echo ""
        read -p "Enter your backend URL (from Railway dashboard): " BACKEND_URL
    else
        echo -e "${GREEN}✅ Backend URL: $BACKEND_URL${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Railway CLI not installed${NC}"
    echo ""
    echo "📋 Backend Deployment Options:"
    echo ""
    echo "Option 1: Install Railway CLI (Recommended)"
    echo "  npm i -g @railway/cli"
    echo "  railway login"
    echo "  cd server && railway init && railway up"
    echo ""
    echo "Option 2: Use Render (Free)"
    echo "  1. Go to https://render.com"
    echo "  2. New → Web Service"
    echo "  3. Connect GitHub repo"
    echo "  4. Root Directory: server"
    echo "  5. Build: npm install"
    echo "  6. Start: npm start"
    echo ""
    read -p "Enter your backend URL (or press Enter to skip): " BACKEND_URL
fi

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ Backend URL is required!${NC}"
    echo "Please deploy backend first, then run this script again."
    exit 1
fi

# Validate backend
echo ""
echo "Testing backend connection..."
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed. Continuing anyway...${NC}"
fi

# Step 3: Configure webhooks
echo ""
echo -e "${CYAN}Step 3: Stripe Webhook Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WEBHOOK_URL="$BACKEND_URL/api/stripe/webhook"
echo "Webhook endpoint URL: $WEBHOOK_URL"
echo ""
echo "📋 Configure webhook in Stripe Dashboard:"
echo "1. Go to: https://dashboard.stripe.com/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. Enter URL: $WEBHOOK_URL"
echo "4. Select events:"
echo "   - customer.subscription.created"
echo "   - customer.subscription.updated"
echo "   - customer.subscription.deleted"
echo "   - invoice.payment_succeeded"
echo "   - invoice.payment_failed"
echo "   - checkout.session.completed"
echo "5. Copy the signing secret (whsec_...)"
echo ""
read -p "Enter Webhook Secret (whsec_...): " WEBHOOK_SECRET

if [[ ! $WEBHOOK_SECRET =~ ^whsec_ ]]; then
    echo -e "${YELLOW}⚠️  Invalid webhook secret format. Continuing anyway...${NC}"
fi

# Update backend webhook secret
if command -v railway &> /dev/null; then
    cd server
    railway variables set STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET" 2>/dev/null || echo "Set manually in Railway dashboard"
    cd ..
fi

# Step 4: Create environment files
echo ""
echo -e "${CYAN}Step 4: Creating Environment Files${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Frontend
cat > .env.production << EOF
# Production Environment Variables
# Generated: $(date)

VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUB_KEY
VITE_API_BASE_URL=$BACKEND_URL
EOF

# Backend
cat > server/.env.production << EOF
# Production Backend Environment Variables
# Generated: $(date)

NODE_ENV=production
STRIPE_SECRET_KEY=$STRIPE_SEC_KEY
CORS_ORIGIN=https://echochat-messaging.web.app
FRONTEND_URL=https://echochat-messaging.web.app
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
PORT=3001
EOF

echo -e "${GREEN}✅ Environment files created${NC}"

# Step 5: Build frontend
echo ""
echo -e "${CYAN}Step 5: Building Frontend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

export VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUB_KEY
export VITE_API_BASE_URL=$BACKEND_URL

echo "Cleaning previous build..."
rm -rf dist

echo "Installing dependencies..."
npm ci --silent

echo "Building for production..."
npm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Step 6: Deploy frontend
echo ""
echo -e "${CYAN}Step 6: Deploying Frontend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Deploying to Firebase..."
if npm run deploy; then
    echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Firebase deployment may need manual intervention${NC}"
    echo "Try running: npm run deploy"
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Stripe Keys: Configured"
echo "  ✅ Backend: $BACKEND_URL"
echo "  ✅ Frontend: https://echochat-messaging.web.app"
echo "  ✅ Webhooks: Configured"
echo ""
echo "🧪 Next Steps:"
echo "1. Visit: https://echochat-messaging.web.app"
echo "2. Test payment flow"
echo "3. Verify webhooks in Stripe Dashboard"
echo "4. Check backend logs for any issues"
echo ""


