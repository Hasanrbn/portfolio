import { loadEnv } from './config/env.js';
import { createApp } from './app.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

let env;
try {
  env = loadEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = createApp({ env });

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Force exit if open connections keep the server from closing.
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
