/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://v2.tauri.app/start/frontend/vite/
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri expects a fixed port, fail if not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  // Tauri CLI env vars
  envPrefix: ['VITE_', 'TAURI_'],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },

  build: {
    // Tauri uses Chromium on Windows, supports ES2021
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('jszip')) return 'vendor-jszip';
          if (id.includes('pdfjs-dist')) return 'vendor-pdf';
          if (id.includes('mammoth')) return 'vendor-mammoth';
          if (id.includes('@tauri-apps')) return 'vendor-tauri';
          return 'vendor-misc';
        },
      },
    },
  },
});
