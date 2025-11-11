/**
 * Production build configuration for backend server
 * Optimizes server code for production deployment
 */

export const productionConfig = {
  // Minification settings
  minify: true,
  sourcemap: false,
  
  // Tree shaking
  treeshake: {
    preset: 'smallest',
    propertyReadSideEffects: false,
  },
  
  // Code splitting (if needed)
  manualChunks: undefined, // Single bundle for server
  
  // External dependencies (keep as-is, don't bundle)
  external: [
    'express',
    'cors',
    'stripe',
    'dotenv',
    'fs',
    'path',
    'http',
    'https',
    'url',
    'crypto',
    'stream',
    'util',
    'events',
    'buffer',
    'os',
    'net',
    'tls',
  ],
  
  // Environment variable replacements
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  
  // Performance optimizations
  optimizeDeps: {
    include: [],
    exclude: ['express', 'stripe', 'cors'],
  },
};

export const developmentConfig = {
  minify: false,
  sourcemap: true,
  treeshake: false,
};


