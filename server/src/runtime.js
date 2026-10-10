import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createPool, pingDatabase } from './db/pool.js';
import { createFileContactStore, createPgContactStore } from './repositories/contactMessages.js';
import { createNotifierFromEnv } from './services/contactNotifier.js';

/**
 * Puts the server's parts together: the database pool, the place messages are kept, the optional
 * email notifier and the Express app. Both ways of running the API use it, so they cannot drift
 * apart: server.js (a long-running process, started with "npm start") and api/index.js (a
 * serverless function on Vercel). It opens no port and does not check the database; the caller
 * decides when to do that.
 *
 * With a database, messages go into PostgreSQL. Without one (local development only; the
 * environment check requires DATABASE_URL in production) they are appended to a local file.
 * `poolMax` limits connections per running copy; serverless functions keep it small because
 * many copies may run at once.
 */
export function createRuntime({ env, logger, poolMax }) {
  let pool = null;
  let contactStore;

  if (env.DATABASE_URL) {
    pool = createPool({
      connectionString: env.DATABASE_URL,
      logger,
      ...(poolMax ? { max: poolMax } : {}),
    });
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

  return { app, pool };
}
