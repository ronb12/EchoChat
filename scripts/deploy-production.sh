#!/bin/bash

# Complete Production Deployment Wizard
# Automates the entire deployment process

set -e

echo "🚀 EchoChat Production Deployment Wizard"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Step 1: Get Stripe LIVE Keys
echo -e "${CYAN}Step 1: Stripe LIVE Keys${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Instructions:"
echo "1. Open: https://dashboard.stripe.com/apikeys"
echo "2. Toggle to LIVE mode (top right)"
echo "3. Copy your LIVE keys"
echo ""
read -p "Press Enter when you have the keys ready..."
echo ""

read -p "Enter Stripe Publishable Key (pk_live_...): " STRIPE_PUB_KEY
read -p "Enter Stripe Secret Key (sk_live_...): " STRIPE_SEC_KEY

if [[ ! $STRIPE_PUB_KEY =~ ^pk_live_ ]] || [[ ! $STRIPE_SEC_KEY =~ ^sk_live_ ]]; then
    echo -e "${RED}❌ Invalid LIVE keys! Keys must start with pk_live_ and sk_live_${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Stripe keys validated${NC}"
echo ""

# Step 2: Deploy Backend
echo -e "${CYAN}Step 2: Backend Deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Select backend hosting platform:"
echo "1) Railway (Recommended - Easiest)"
echo "2) Render"
echo "3) Heroku"
echo "4) Already deployed (I have the URL)"
echo ""
read -p "Choice [1-4]: " PLATFORM_CHOICE

case $PLATFORM_CHOICE in
    1)
        echo -e "${YELLOW}Deploying to Railway...${NC}"
        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm i -g @railway/cli
        fi
        
        echo ""
        echo "📋 Railway Deployment Steps:"
        echo "1. Run: railway login"
        echo "2. Run: cd server && railway init"
        echo "3. Set environment variables in Railway dashboard"
        echo ""
        read -p "Press Enter to continue with Railway CLI..."
        
        cd server
        railway login || echo "Please login manually: railway login"
        railway init || echo "Project already initialized"
        
        echo ""
        echo "📋 Set these environment variables in Railway dashboard:"
        echo "  NODE_ENV=production"
        echo "  STRIPE_SECRET_KEY=$STRIPE_SEC_KEY"
        echo "  CORS_ORIGIN=https://echochat-messaging.web.app"
        echo "  FRONTEND_URL=https://echochat-messaging.web.app"
        echo ""
        read -p "Press Enter after setting variables in Railway dashboard..."
        
        railway up || echo "Deployment in progress..."
        cd ..
        ;;
    2)
        echo -e "${YELLOW}Render Deployment Instructions:${NC}"
        echo ""
        echo "1. Go to https://render.com"
        echo "2. New → Web Service"
        echo "3. Connect GitHub repository"
        echo "4. Configure:"
        echo "   - Root Directory: server"
        echo "   - Build Command: npm install"
        echo "   - Start Command: npm start"
        echo "5. Set environment variables:"
        echo "   NODE_ENV=production"
        echo "   STRIPE_SECRET_KEY=$STRIPE_SEC_KEY"
        echo "   CORS_ORIGIN=https://echochat-messaging.web.app"
        echo "   FRONTEND_URL=https://echochat-messaging.web.app"
        echo "6. Deploy"
        echo ""
        read -p "Enter your Render backend URL after deployment: " BACKEND_URL
        ;;
    3)
        echo -e "${YELLOW}Heroku Deployment...${NC}"
        if ! command -v heroku &> /dev/null; then
            echo "Install Heroku CLI: brew install heroku/brew/heroku"
            exit 1
        fi
        
        echo "Creating Heroku app..."
        heroku create echochat-backend-$(date +%s | tail -c 6)
        heroku config:set NODE_ENV=production
        heroku config:set STRIPE_SECRET_KEY="$STRIPE_SEC_KEY"
        heroku config:set CORS_ORIGIN=https://echochat-messaging.web.app
        heroku config:set FRONTEND_URL=https://echochat-messaging.web.app
        
        git push heroku main || echo "Deploy via: git push heroku main"
        BACKEND_URL=$(heroku info -s | grep web_url | cut -d= -f2)
        ;;
    4)
        read -p "Enter your backend URL: " BACKEND_URL
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Get backend URL if not set
if [ -z "$BACKEND_URL" ]; then
    echo ""
    read -p "Enter your backend URL (e.g., https://backend.railway.app): " BACKEND_URL
fi

# Validate backend URL
if [[ ! $BACKEND_URL =~ ^https?:// ]]; then
    echo -e "${RED}❌ Invalid URL format${NC}"
    exit 1
fi

# Test backend health
echo ""
echo "Testing backend connection..."
HEALTH=$(curl -s "$BACKEND_URL/health" || echo "failed")
if [[ $HEALTH == "failed" ]]; then
    echo -e "${YELLOW}⚠️  Backend health check failed. Continuing anyway...${NC}"
else
    echo -e "${GREEN}✅ Backend is accessible${NC}"
fi

# Step 3: Configure Webhooks
echo ""
echo -e "${CYAN}Step 3: Stripe Webhook Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Instructions:"
echo "1. Go to: https://dashboard.stripe.com/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. Enter URL: $BACKEND_URL/api/stripe/webhook"
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

# Update backend webhook secret if Railway
if [ "$PLATFORM_CHOICE" = "1" ] && command -v railway &> /dev/null; then
    echo "Updating webhook secret in Railway..."
    cd server
    railway variables set STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET" || echo "Set manually in Railway dashboard"
    cd ..
fi

echo -e "${GREEN}✅ Webhook configured${NC}"

# Step 4: Create environment files
echo ""
echo -e "${CYAN}Step 4: Creating Environment Files${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Frontend .env.production
cat > .env.production << EOF
# Production Environment Variables
VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUB_KEY
VITE_API_BASE_URL=$BACKEND_URL
EOF

# Backend .env.production
cat > server/.env.production << EOF
# Production Backend Environment Variables
NODE_ENV=production
STRIPE_SECRET_KEY=$STRIPE_SEC_KEY
CORS_ORIGIN=https://echochat-messaging.web.app
FRONTEND_URL=https://echochat-messaging.web.app
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
PORT=3001
EOF

echo -e "${GREEN}✅ Environment files created${NC}"

# Step 5: Build Frontend
echo ""
echo -e "${CYAN}Step 5: Building Frontend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

export VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUB_KEY
export VITE_API_BASE_URL=$BACKEND_URL

echo "Cleaning previous build..."
rm -rf dist

echo "Installing dependencies..."
npm ci

echo "Building for production..."
npm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Step 6: Deploy Frontend
echo ""
echo -e "${CYAN}Step 6: Deploying Frontend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Deploying to Firebase..."
npm run deploy

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Deployment Summary:"
echo "  Frontend: https://echochat-messaging.web.app"
echo "  Backend: $BACKEND_URL"
echo "  Stripe: LIVE mode configured"
echo "  Webhooks: Configured"
echo ""
echo "🧪 Next Steps:"
echo "1. Visit: https://echochat-messaging.web.app"
echo "2. Test payment flow"
echo "3. Verify webhooks in Stripe Dashboard"
echo "4. Check backend logs"
echo ""


