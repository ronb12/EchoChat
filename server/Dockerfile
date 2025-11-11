# Multi-stage build for production-ready backend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm ci --only=production

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy dependencies and server files
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Set working directory to server
WORKDIR /app/server

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]


