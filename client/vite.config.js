import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPlugin } from './seo.js';

const API_TARGET = 'http://localhost:3000';
const SHARED_DIR = fileURLToPath(new URL('../shared', import.meta.url));
const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  // SITE_URL is read from the repository's .env or from the build environment (a host's settings).
  const { SITE_URL } = loadEnv(mode, ROOT_DIR, '');

  return {
    plugins: [react(), seoPlugin({ siteUrl: SITE_URL, sharedDir: SHARED_DIR })],
    server: {
      port: 5173,
      // Lets the browser call /api and /healthz on the Vite origin during development,
      // which matches how a single deployed service will behave in production.
      proxy: {
        '/api': API_TARGET,
        '/healthz': API_TARGET,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.js'],
      // CSS Modules return class-name proxies; real CSS is not needed to test behaviour.
      css: false,
    },
  };
});
