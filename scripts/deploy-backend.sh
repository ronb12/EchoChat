#!/bin/bash

# EchoChat Backend Deployment Script
# Supports: Railway, Render, Heroku, Docker

set -e

echo "🚀 EchoChat Backend Deployment Script"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if environment variables are set
check_env() {
    if [ -z "$STRIPE_SECRET_KEY" ]; then
        echo -e "${RED}❌ STRIPE_SECRET_KEY not set${NC}"
        exit 1
    fi
    
    if [ -z "$CORS_ORIGIN" ]; then
        echo -e "${YELLOW}⚠️  CORS_ORIGIN not set, using default${NC}"
        export CORS_ORIGIN="https://echochat-messaging.web.app,https://echochat-messaging.firebaseapp.com"
    fi
    
    if [ -z "$NODE_ENV" ]; then
        export NODE_ENV="production"
    fi
    
    echo -e "${GREEN}✅ Environment variables validated${NC}"
}

# Deploy to Railway
deploy_railway() {
    echo -e "${YELLOW}Deploying to Railway...${NC}"
    
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not installed${NC}"
        echo "Install with: npm i -g @railway/cli"
        exit 1
    fi
    
    check_env
    
    cd server
    railway up
    echo -e "${GREEN}✅ Railway deployment complete${NC}"
}

# Deploy to Render
deploy_render() {
    echo -e "${YELLOW}Deploying to Render...${NC}"
    echo -e "${YELLOW}Note: Render deployment should be done via Render dashboard or GitHub integration${NC}"
    echo ""
    echo "Steps:"
    echo "1. Go to https://render.com"
    echo "2. New → Web Service"
    echo "3. Connect GitHub repository"
    echo "4. Configure:"
    echo "   - Root Directory: server"
    echo "   - Build Command: npm install"
    echo "   - Start Command: npm start"
    echo "5. Set environment variables"
    echo "6. Deploy"
}

# Deploy to Heroku
deploy_heroku() {
    echo -e "${YELLOW}Deploying to Heroku...${NC}"
    
    if ! command -v heroku &> /dev/null; then
        echo -e "${RED}❌ Heroku CLI not installed${NC}"
        echo "Install with: brew install heroku/brew/heroku"
        exit 1
    fi
    
    check_env
    
    # Create Heroku app if it doesn't exist
    if [ -z "$HEROKU_APP_NAME" ]; then
        echo -e "${YELLOW}Creating Heroku app...${NC}"
        heroku create echochat-backend-$(date +%s)
    fi
    
    # Set environment variables
    heroku config:set NODE_ENV=production
    heroku config:set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
    heroku config:set CORS_ORIGIN="$CORS_ORIGIN"
    heroku config:set FRONTEND_URL="https://echochat-messaging.web.app"
    
    if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
        heroku config:set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
    fi
    
    # Deploy
    git push heroku main
    echo -e "${GREEN}✅ Heroku deployment complete${NC}"
}

# Build Docker image
build_docker() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    
    cd server
    docker build -t echochat-backend:latest .
    echo -e "${GREEN}✅ Docker image built${NC}"
    echo ""
    echo "To run: docker run -p 3001:3001 -e STRIPE_SECRET_KEY=... echochat-backend:latest"
}

# Main menu
show_menu() {
    echo "Select deployment target:"
    echo "1) Railway"
    echo "2) Render (instructions)"
    echo "3) Heroku"
    echo "4) Docker (build only)"
    echo "5) Exit"
    echo ""
    read -p "Choice [1-5]: " choice
    
    case $choice in
        1) deploy_railway ;;
        2) deploy_render ;;
        3) deploy_heroku ;;
        4) build_docker ;;
        5) exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
}

# Check if platform is specified
if [ "$1" = "railway" ]; then
    deploy_railway
elif [ "$1" = "render" ]; then
    deploy_render
elif [ "$1" = "heroku" ]; then
    deploy_heroku
elif [ "$1" = "docker" ]; then
    build_docker
else
    show_menu
fi


