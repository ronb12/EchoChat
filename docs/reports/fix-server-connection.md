# Fix Server Connection Issues

## Quick Fixes

### 1. Check if ports are in use
```bash
# Kill processes on ports
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
```

### 2. Start Dev Server
```bash
cd /Users/ronellbradley/Desktop/EchoChat
npm run dev
```

The server should start on port 5173 (or next available port like 3000, 3001, etc.)

### 3. Start Backend Server (Optional)
```bash
cd /Users/ronellbradley/Desktop/EchoChat
npm run server:dev
```

Backend server runs on port 3001

### 4. Check Server Status
```bash
# Check dev server
curl http://localhost:5173

# Check backend server
curl http://localhost:3001/health
```

---

## Common Issues

### Issue 1: Port Already in Use
**Error**: `Port 5173 is already in use`

**Solution**:
```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9

# Or use a different port
PORT=3000 npm run dev
```

### Issue 2: Backend Server Not Starting
**Error**: `Cannot find module` or `STRIPE_SECRET_KEY not set`

**Solution**:
```bash
# Install server dependencies
cd server
npm install

# Or from root
npm run server:install

# Backend will work without Stripe key (uses test data)
```

### Issue 3: CORS Errors
**Error**: `Access to fetch blocked by CORS policy`

**Solution**:
- Make sure backend server is running
- Check `server/server.js` CORS configuration
- Verify `API_BASE_URL` in frontend matches backend port

### Issue 4: API Connection Failed
**Error**: `Failed to fetch` or `Network error`

**Solution**:
1. Check if backend is running: `curl http://localhost:3001/health`
2. For test account, backend is optional (uses sample data)
3. Update `API_BASE_URL` in `src/components/SettingsModal.jsx` if needed

---

## Environment Variables

### Frontend (.env or .env.local)
```bash
VITE_API_BASE_URL=http://localhost:3001
```

### Backend (server/.env)
```bash
PORT=3001
STRIPE_SECRET_KEY=sk_test_...  # Optional for test account
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

---

## Test Connection

### Test Dev Server
```bash
# Should return HTML
curl http://localhost:5173
```

### Test Backend Server
```bash
# Should return: {"status":"ok","timestamp":"..."}
curl http://localhost:3001/health
```

### Test API Endpoint
```bash
# Should return account status or error
curl http://localhost:3001/api/stripe/account-status/test-business-1
```

---

## Manual Start Sequence

1. **Terminal 1 - Dev Server**:
   ```bash
   cd /Users/ronellbradley/Desktop/EchoChat
   npm run dev
   ```

2. **Terminal 2 - Backend Server** (optional):
   ```bash
   cd /Users/ronellbradley/Desktop/EchoChat
   npm run server:dev
   ```

3. **Open Browser**:
   - Dev server: `http://localhost:5173` (or port shown in terminal)
   - If connection fails, check terminal for errors

---

## Debugging Steps

1. **Check if processes are running**:
   ```bash
   ps aux | grep -E "vite|node.*server" | grep -v grep
   ```

2. **Check port availability**:
   ```bash
   lsof -i :5173
   lsof -i :3001
   ```

3. **Check logs**:
   - Dev server logs in terminal
   - Backend server logs in terminal
   - Browser console (F12) for frontend errors

4. **Test with curl**:
   ```bash
   curl -v http://localhost:5173
   curl -v http://localhost:3001/health
   ```

---

## Quick Start Script

Create `start-servers.sh`:
```bash
#!/bin/bash

# Kill existing processes
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start dev server
npm run dev &
sleep 3

# Start backend server
npm run server:dev &
sleep 3

echo "✅ Servers started"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3001"
```

Run with: `chmod +x start-servers.sh && ./start-servers.sh`



