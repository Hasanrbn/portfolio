import { fileURLToPath } from 'node:url';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { installShutdownHandlers } from './lifecycle.js';
import { createFileContactStore } from './repositories/contactMessages.js';
import { createNotifierFromEnv } from './services/contactNotifier.js';
import { createLogger } from './utils/logger.js';

// Slow or stalled requests are cut off instead of holding connections open forever.
const REQUEST_TIMEOUT_MS = 30_000;

let env;
try {
  env = loadEnv();
} catch (error) {
  // The logger needs the environment, so this one message goes straight to the console.
  console.error(error.message);
  process.exit(1);
}

const logger = createLogger(env);

// Until the database exists (Phase 12), contact messages are saved to a local file.
const contactFile =
  env.CONTACT_STORE_PATH ??
  fileURLToPath(new URL('../data/contact-messages.jsonl', import.meta.url));
const contactNotifier = createNotifierFromEnv(env, logger);
if (!contactNotifier) {
  logger.info('Contact email notifications are off (SMTP_HOST is not set)');
}

const app = createApp({
  env,
  logger,
  contactStore: createFileContactStore({ filePath: contactFile }),
  contactNotifier,
});

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
server.requestTimeout = REQUEST_TIMEOUT_MS;

installShutdownHandlers({ server, logger });
