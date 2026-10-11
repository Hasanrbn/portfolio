import { randomBytes } from 'node:crypto';
import { createPool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';

/** Address of a throw-away database for integration tests. Without it those tests are skipped. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/**
 * Gives a test file its own empty copy of the schema inside the test database: a new
 * PostgreSQL schema with every migration applied. Files run in parallel without seeing each
 * other's rows, and nothing is left behind after `drop()`.
 */
export async function createTestDatabase({ migrate = true } = {}) {
  const schema = `test_${randomBytes(6).toString('hex')}`;

  const adminPool = createPool({ connectionString: TEST_DATABASE_URL, max: 1 });
  await adminPool.query(`CREATE SCHEMA ${schema}`);

  if (migrate) {
    // No lock: the lock is database-wide, so test files migrating their own schemas at the
    // same moment would otherwise fail with "Another migration is already running".
    await runMigrations({ connection: TEST_DATABASE_URL, schema, lock: false });
  }

  const pool = createPool({
    connectionString: TEST_DATABASE_URL,
    max: 4,
    poolOptions: { options: `-c search_path=${schema}` },
  });

  return {
    pool,
    schema,
    connection: TEST_DATABASE_URL,
    async drop() {
      // A test may already have closed it (to simulate a database that went away).
      if (!pool.ended) await pool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await adminPool.end();
    },
  };
}
