import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the browser call /api and /healthz on the Vite origin during development,
    // which matches how a single deployed service will behave in production.
    proxy: {
      '/api': API_TARGET,
      '/healthz': API_TARGET,
    },
  },
});
