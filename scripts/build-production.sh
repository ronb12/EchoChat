#!/bin/bash

# Production Build Script
# Builds frontend with production environment variables

set -e

echo "🏗️  Building EchoChat for Production"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Run: ./scripts/setup-production-env.sh"
    exit 1
fi

# Load production environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required variables
if [ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ VITE_STRIPE_PUBLISHABLE_KEY not set${NC}"
    exit 1
fi

if [ -z "$VITE_API_BASE_URL" ]; then
    echo -e "${RED}❌ VITE_API_BASE_URL not set${NC}"
    exit 1
fi

# Check if Stripe key is LIVE
if [[ ! $VITE_STRIPE_PUBLISHABLE_KEY =~ ^pk_live_ ]]; then
    echo -e "${RED}❌ WARNING: Not using LIVE Stripe key!${NC}"
    echo "   Current: $VITE_STRIPE_PUBLISHABLE_KEY"
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo "  Stripe Key: ${VITE_STRIPE_PUBLISHABLE_KEY:0:20}..."
echo "  API URL: $VITE_API_BASE_URL"
echo ""

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist
echo -e "${GREEN}✅ Cleaned${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm ci
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Build
echo "🔨 Building for production..."
npm run build
echo ""

# Check build output
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}❌ Build failed - dist directory is empty${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Build output: dist/"
echo ""
echo "Next steps:"
echo "1. Review build: npm run preview"
echo "2. Deploy to Firebase: npm run deploy"
echo ""


