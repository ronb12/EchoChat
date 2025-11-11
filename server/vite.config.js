import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite configuration for backend server
 * Provides environment variable handling and build optimization
 */
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    // Server configuration
    server: {
      port: 3001,
      host: true,
      strictPort: true,
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'node18',
      minify: isProduction ? 'terser' : false,
      sourcemap: !isProduction,
      rollupOptions: {
        input: {
          server: resolve(__dirname, 'server.js'),
        },
        output: {
          format: 'cjs', // CommonJS for Node.js compatibility
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
        external: [
          // Keep Node.js built-ins external
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
        ],
      },
      terserOptions: isProduction ? {
        compress: {
          drop_console: false, // Keep console logs for server debugging
          drop_debugger: true,
        },
        format: {
          comments: false,
        },
      } : {},
    },
    
    // Environment variables
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
    },
    
    // Optimize dependencies
    optimizeDeps: {
      exclude: ['express', 'stripe', 'cors'],
    },
    
    // Mode-specific config
    mode: mode || 'development',
  };
});

