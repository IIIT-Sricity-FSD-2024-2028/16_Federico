import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Every route in this app keeps the legacy `.html` suffix (DEC-1 in
 * react-migration-plan.md) — e.g. /HOM/screen-02-bed-management.html. Vite's
 * built-in SPA history fallback deliberately ignores request paths whose last
 * segment contains a dot, because it assumes those are files. That makes every
 * one of our routes 404 on a hard reload or a pasted deep link.
 *
 * This plugin rewrites navigation requests to /index.html before Vite's static
 * and HTML middleware sees them. A navigation is identified by the browser
 * sending `Accept: text/html`; module, asset and HMR requests send other Accept
 * values, so they fall through untouched. Vite internals under /@... and source
 * files under /src/ are excluded outright as a second guard.
 *
 * Production hosting needs the equivalent rewrite (see front-end/README.md,
 * written in Phase 10).
 */
function htmlSuffixSpaFallback() {
  const PASSTHROUGH = [/^\/@/, /^\/src\//, /^\/node_modules\//, /^\/favicon\.ico$/];

  const middleware = (req, _res, next) => {
    const url = req.url || '/';
    const path = url.split('?')[0].split('#')[0];

    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (path === '/index.html') return next();
    if (PASSTHROUGH.some((re) => re.test(path))) return next();

    const accept = req.headers.accept || '';
    if (!accept.includes('text/html')) return next();

    req.url = '/index.html';
    return next();
  };

  return {
    name: 'federico-html-suffix-spa-fallback',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), htmlSuffixSpaFallback()],
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
