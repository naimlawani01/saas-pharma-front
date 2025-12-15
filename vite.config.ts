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
    hmr: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
