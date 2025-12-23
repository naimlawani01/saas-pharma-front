import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// IMPORTANT pour Electron : s'assurer qu'il n'y a QU'UNE SEULE copie de React
const reactPath = path.resolve(__dirname, 'node_modules/react');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: reactPath,
      'react-dom': reactDomPath,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      // Désactiver complètement le WebSocket HMR pour Electron
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: false,
    },
    // Permettre les connexions depuis Electron
    cors: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
