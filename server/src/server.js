import { fileURLToPath } from 'node:url';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { createFileContactStore } from './repositories/contactMessages.js';
import { createNotifierFromEnv } from './services/contactNotifier.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

let env;
try {
  env = loadEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Until the database exists (Phase 12), contact messages are saved to a local file.
const contactFile =
  env.CONTACT_STORE_PATH ??
  fileURLToPath(new URL('../data/contact-messages.jsonl', import.meta.url));
const contactNotifier = createNotifierFromEnv(env);
if (!contactNotifier) {
  console.log('Contact email notifications are off (SMTP_HOST is not set).');
}
const app = createApp({
  env,
  contactStore: createFileContactStore({ filePath: contactFile }),
  contactNotifier,
});

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
