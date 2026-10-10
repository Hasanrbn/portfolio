import { loadEnv } from './config/env.js';
import { productionWarnings } from './config/warnings.js';
import { createRuntime } from './runtime.js';
import { assertMigrated } from './db/migrate.js';
import { installShutdownHandlers } from './lifecycle.js';
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

const { app, pool } = createRuntime({ env, logger });

if (pool) {
  try {
    // Stop at once, with a clear message, if the database is unreachable or not migrated,
    // instead of failing on the first visitor's request.
    await assertMigrated(pool);
  } catch (error) {
    logger.fatal({ err: error }, 'database is not ready; run "npm run db:migrate"');
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
server.requestTimeout = REQUEST_TIMEOUT_MS;

installShutdownHandlers({
  server,
  logger,
  cleanup: pool ? [() => pool.end()] : [],
});
