import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'fs';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          crypto: ['crypto-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    fs: {
      allow: ['..']
    }
  },
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    {
      name: 'copy-manifest',
      writeBundle() {
        // Copy manifest.json to root of dist directory
        const manifestSrc = resolve(__dirname, 'public/manifest.json');
        const manifestDest = resolve(__dirname, 'dist/manifest.json');
        if (existsSync(manifestSrc)) {
          copyFileSync(manifestSrc, manifestDest);
          console.log('Copied manifest.json to dist root');
        }
        
        // Also copy icons directory to root
        const iconsSrc = resolve(__dirname, 'public/icons');
        const iconsDest = resolve(__dirname, 'dist/icons');
        if (existsSync(iconsSrc)) {
          const { execSync } = require('child_process');
          try {
            execSync(`cp -r "${iconsSrc}" "${iconsDest}"`, { stdio: 'inherit' });
            console.log('Copied icons directory to dist root');
          } catch (error) {
            console.log('Error copying icons:', error.message);
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@styles': resolve(__dirname, 'styles'),
      '@icons': resolve(__dirname, 'icons')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'crypto-js']
  },
  css: {
    devSourcemap: true
  }
});
