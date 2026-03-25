import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const backendTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000';
const sharePublicDir = process.env.VITE_SHARE_PUBLIC_DIR
  ? resolve(__dirname, process.env.VITE_SHARE_PUBLIC_DIR)
  : false;

export default defineConfig({
  plugins: [react()],
  publicDir: sharePublicDir,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/raw': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('@ant-design/plots') || id.includes('@antv')) {
            return 'charts-vendor';
          }

          if (id.includes('@ant-design/x-markdown') || id.includes('katex')) {
            return 'markdown-vendor';
          }
        },
      },
    },
  },
});
