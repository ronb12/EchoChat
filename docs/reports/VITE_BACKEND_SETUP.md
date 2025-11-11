# Vite Backend Setup - Production Ready

## Overview

The backend server now uses Vite for environment variable handling and production build optimization while maintaining CommonJS compatibility.

## Key Features

✅ **Vite Environment Variables** - Supports both `VITE_` and standard prefixes  
✅ **Production Build** - Optimized builds with minification and tree-shaking  
✅ **CommonJS Compatible** - Works with existing Express/Node.js setup  
✅ **Development Tools** - Hot reload and development server support  

## Quick Start

### Development

```bash
# From root directory
npm run server:dev

# Or from server directory
cd server
npm run dev
```

### Production Build

```bash
# Build for production
npm run server:build:prod

# Start production server
npm run server:start:prod
```

## Environment Variables

The server now supports both standard and Vite-prefixed variables:

```env
# Standard format (works as before)
STRIPE_SECRET_KEY=sk_test_...
CORS_ORIGIN=http://localhost:3000

# Vite format (also supported)
VITE_STRIPE_SECRET_KEY=sk_test_...
VITE_API_BASE_URL=http://localhost:3001
```

The server automatically converts `VITE_STRIPE_SECRET_KEY` to `STRIPE_SECRET_KEY` if needed.

## Build Process

### Development Build

```bash
npm run server:build
```

- Includes sourcemaps
- No minification
- Fast build times

### Production Build

```bash
npm run server:build:prod
```

- Minified output
- Tree-shaking enabled
- Optimized for production
- Output: `server/dist/server.js`

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run server:dev` | Development with hot reload |
| `npm run server:build` | Build (development mode) |
| `npm run server:build:prod` | Build (production mode) |
| `npm run server:start` | Start server (from source) |
| `npm run server:start:prod` | Start production build |
| `npm run server:preview` | Preview production build |

## File Structure

```
server/
├── server.js              # Main server file (CommonJS)
├── vite.config.js         # Vite configuration
├── vite-env-loader.js     # Environment variable loader (ESM)
├── build.config.js        # Production build config
├── package.json           # Updated with Vite scripts
├── .env                   # Environment variables
└── dist/                  # Build output (generated)
```

## Production Deployment

### Option 1: Use Source Files (Recommended)

For most deployments, use the source files directly:

```bash
# On hosting platform, set:
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
CORS_ORIGIN=https://your-domain.com

# Start command:
npm run server
```

### Option 2: Use Built Files

For optimized deployments:

```bash
# Build step
npm run server:build:prod

# Start command:
npm run server:start:prod
```

## Compatibility

- ✅ **CommonJS** - Server uses `require()` and `module.exports`
- ✅ **Node.js 18+** - Required for Vite build
- ✅ **Express** - Works with existing Express setup
- ✅ **Environment Variables** - Supports both formats

## Troubleshooting

### Build Errors

If you get module errors, ensure:
1. `npm install` completed successfully
2. Node.js version is 18+
3. All dependencies are installed

### Environment Variables Not Loading

1. Check `.env` file exists in `server/` directory
2. Verify variable names (case-sensitive)
3. Restart server after changes

### Vite Build Issues

If Vite build fails:
1. Check `server/vite.config.js` is correct
2. Ensure `server/server.js` is valid CommonJS
3. Try building from source: `npm run server` (skips Vite)

## Next Steps

1. ✅ Vite configured for backend
2. ✅ Environment variable handling
3. ✅ Production build scripts
4. ⏭️ Deploy to production hosting
5. ⏭️ Configure production environment variables

## Notes

- The server remains **CommonJS** for compatibility
- Vite is used for **build optimization** and **env handling**
- Production builds are **optional** - source files work fine
- All existing functionality is preserved


