import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    // FIX: Vite's HMR module spawns a Web Worker from a blob: URL.
    // Without an explicit worker-src the browser falls back to script-src,
    // which doesn't include blob:, so the worker is blocked and the dev
    // server appears to disconnect ("server connection lost" loop).
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: http://localhost:* https://*",
        "connect-src 'self' http://localhost:* ws://localhost:*",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "worker-src 'self' blob:",
      ].join('; '),
    },
  },
});
