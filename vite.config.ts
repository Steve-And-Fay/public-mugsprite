import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Production CSP. Emitted to dist/_headers ONLY during a production build —
// keeping this file out of public/ matters, because netlify dev reads
// public/_headers and applying the CSP to the dev server breaks Vite's
// inline React Fast Refresh preamble script.
const PROD_CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "img-src 'self' data: https:; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self'; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'";

function emitNetlifyHeaders(): PluginOption {
  return {
    name: 'emit-netlify-headers',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: `/*\n  Content-Security-Policy: ${PROD_CSP}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), emitNetlifyHeaders()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
  },
});
