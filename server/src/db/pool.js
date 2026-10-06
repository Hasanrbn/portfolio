import pg from 'pg';

const DEFAULTS = {
  max: 10,
  // Idle connections are released so a quiet site does not hold database slots.
  idleTimeoutMillis: 30_000,
  // Waiting longer than this for a free connection means the database is in trouble:
  // fail the request instead of letting it hang.
  connectionTimeoutMillis: 5_000,
  // No single query may run longer than this (milliseconds, enforced by the database).
  statementTimeoutMs: 10_000,
};

/**
 * Creates the connection pool the whole server shares. Every query goes through it, which
 * limits how many connections the database sees and reuses them between requests.
 *
 * `poolOptions` is only for tests (for example a private schema). The connection string is never logged.
 */
export function createPool({ connectionString, logger, poolOptions = {}, ...overrides }) {
  if (!connectionString) {
    throw new Error('createPool needs a connection string (DATABASE_URL)');
  }

  const { statementTimeoutMs, ...poolDefaults } = { ...DEFAULTS, ...overrides };
  const pool = new pg.Pool({
    connectionString,
    application_name: 'portfolio-api',
    statement_timeout: statementTimeoutMs,
    ...poolDefaults,
    ...poolOptions,
  });

  // An idle connection can break (database restart, network). Without a handler Node would
  // treat the event as an uncaught exception and stop the process.
  pool.on('error', (err) => {
    logger?.error({ err }, 'unexpected error on an idle database connection');
  });

  return pool;
}

/** True when the database answers a trivial query within `timeoutMs`. */
export async function pingDatabase(pool, timeoutMs = 2_000) {
  let timer;
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('database ping timed out')), timeoutMs);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
