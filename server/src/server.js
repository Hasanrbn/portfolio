import { fileURLToPath } from 'node:url';
import { loadEnv } from './config/env.js';
import { productionWarnings } from './config/warnings.js';
import { createApp } from './app.js';
import { createPool, pingDatabase } from './db/pool.js';
import { assertMigrated } from './db/migrate.js';
import { installShutdownHandlers } from './lifecycle.js';
import { createFileContactStore, createPgContactStore } from './repositories/contactMessages.js';
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
for (const warning of productionWarnings(env)) {
  logger.warn(warning);
}

// With a database, messages go into PostgreSQL. Without one (local development only; the
// environment check requires DATABASE_URL in production) they are appended to a local file.
let pool = null;
let contactStore;
if (env.DATABASE_URL) {
  pool = createPool({ connectionString: env.DATABASE_URL, logger });
  try {
    // Stop at once, with a clear message, if the database is unreachable or not migrated,
    // instead of failing on the first visitor's request.
    await assertMigrated(pool);
  } catch (error) {
    logger.fatal({ err: error }, 'database is not ready; run "npm run db:migrate"');
    await pool.end().catch(() => {});
    process.exit(1);
  }
  contactStore = createPgContactStore({ pool });
} else {
  logger.warn('DATABASE_URL is not set: contact messages are saved to a local file');
  const contactFile =
    env.CONTACT_STORE_PATH ??
    fileURLToPath(new URL('../data/contact-messages.jsonl', import.meta.url));
  contactStore = createFileContactStore({ filePath: contactFile });
}

const contactNotifier = createNotifierFromEnv(env, logger);
if (!contactNotifier) {
  logger.info('Contact email notifications are off (SMTP_HOST is not set)');
}

const app = createApp({
  env,
  logger,
  contactStore,
  contactNotifier,
  checkReady: pool ? () => pingDatabase(pool) : null,
});

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
server.requestTimeout = REQUEST_TIMEOUT_MS;

installShutdownHandlers({
  server,
  logger,
  cleanup: pool ? [() => pool.end()] : [],
});
