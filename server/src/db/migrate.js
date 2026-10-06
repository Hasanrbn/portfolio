import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';

export const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url));
export const MIGRATIONS_TABLE = 'pgmigrations';

/** Names of the migration files, oldest first, without the ".js". */
export async function listMigrationFiles(dir = MIGRATIONS_DIR) {
  const files = await readdir(dir);
  return files
    .filter((file) => file.endsWith('.js'))
    .map((file) => file.slice(0, -3))
    .sort();
}

/**
 * Runs migrations and returns the names that were applied (or reverted).
 *
 *   direction 'up'   -> apply every pending migration (or `count` of them)
 *   direction 'down' -> revert the last `count` migrations (default 1; Infinity = all)
 *
 * `connection` is a connection string, or a pg client config (tests use it to pick a schema).
 */
export async function runMigrations({
  connection,
  direction = 'up',
  count,
  schema,
  logger,
  dir = MIGRATIONS_DIR,
}) {
  const applied = await runner({
    databaseUrl: connection,
    dir,
    direction,
    count: count ?? (direction === 'up' ? Infinity : 1),
    migrationsTable: MIGRATIONS_TABLE,
    schema,
    createSchema: Boolean(schema),
    checkOrder: true,
    // Each migration runs in its own transaction: it applies completely or not at all.
    singleTransaction: false,
    log: (message) => logger?.debug(message),
    logger: {
      debug: (message) => logger?.debug(message),
      info: (message) => logger?.info(message),
      warn: (message) => logger?.warn(message),
      error: (message) => logger?.error(message),
    },
  });
  return applied.map((migration) => migration.name);
}

/**
 * Which migrations are applied and which are still pending, comparing the files on disk with
 * the migrations table. A database that was never migrated has no table: everything is pending.
 */
export async function getMigrationStatus(pool, dir = MIGRATIONS_DIR) {
  const files = await listMigrationFiles(dir);

  let applied = [];
  try {
    const { rows } = await pool.query(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`);
    applied = rows.map((row) => row.name);
  } catch (error) {
    // 42P01 = the table does not exist yet.
    if (error.code !== '42P01') {
      throw error;
    }
  }

  const appliedSet = new Set(applied);
  return {
    applied,
    pending: files.filter((file) => !appliedSet.has(file)),
    // Recorded in the database but missing on disk: this copy of the code is older than the
    // database, which is a deployment mistake worth knowing about.
    unknown: applied.filter((name) => !files.includes(name)),
  };
}

/** Throws a clear error when the database does not match the code. Used when the server starts. */
export async function assertMigrated(pool, dir = MIGRATIONS_DIR) {
  const { pending, unknown } = await getMigrationStatus(pool, dir);
  if (pending.length > 0) {
    throw new Error(
      `The database is missing ${pending.length} migration(s): ${pending.join(', ')}. ` +
        'Run "npm run db:migrate".',
    );
  }
  if (unknown.length > 0) {
    throw new Error(
      `The database has migrations this version of the code does not know: ${unknown.join(', ')}. ` +
        'Deploy the newer code, or restore the database.',
    );
  }
}
