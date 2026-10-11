import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertMigrated,
  getMigrationStatus,
  listMigrationFiles,
  runMigrations,
} from '../../src/db/migrate.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

// What is left once every migration has run: the contact messages, and the table that
// records which migrations ran.
const TABLES = ['messages', 'pgmigrations'];

// Created by the first two migrations and removed again by the last one.
const REMOVED_CONTENT_TABLES = [
  'certificates',
  'education',
  'experience_technologies',
  'experiences',
  'post_tags',
  'posts',
  'project_images',
  'project_technologies',
  'projects',
  'skills',
  'tags',
  'technologies',
];

describe.skipIf(!TEST_DATABASE_URL)('migrations (PostgreSQL)', () => {
  let db;
  const tables = async () => {
    const { rows } = await db.pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1`,
      [db.schema],
    );
    return rows.map((row) => row.table_name);
  };
  const functions = async () => {
    const { rows } = await db.pool.query(
      `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = $1 ORDER BY 1`,
      [db.schema],
    );
    return rows.map((row) => row.proname);
  };
  const migrate = (options = {}) =>
    runMigrations({ connection: db.connection, schema: db.schema, lock: false, ...options });

  beforeAll(async () => {
    db = await createTestDatabase({ migrate: false });
  });
  afterAll(() => db.drop());

  it('reports everything as pending before the first run, then nothing', async () => {
    const files = await listMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(await getMigrationStatus(db.pool)).toEqual({ applied: [], pending: files, unknown: [] });
    await expect(assertMigrated(db.pool)).rejects.toThrow(/missing \d+ migration/);

    const applied = await migrate();

    expect(applied).toEqual(files);
    expect(await getMigrationStatus(db.pool)).toEqual({ applied: files, pending: [], unknown: [] });
    await expect(assertMigrated(db.pool)).resolves.toBeUndefined();
  });

  it('ends with only the tables the server uses: no content tables, no leftover function', async () => {
    expect(await tables()).toEqual(TABLES);
    expect(await functions()).not.toContain('set_updated_at');
  });

  it('applies nothing the second time', async () => {
    expect(await migrate()).toEqual([]);
  });

  it('flags a migration the code does not know about', async () => {
    await db.pool.query(
      `INSERT INTO pgmigrations (name, run_on) VALUES ('9999_from_the_future', now())`,
    );

    await expect(assertMigrated(db.pool)).rejects.toThrow(/9999_from_the_future/);

    await db.pool.query(`DELETE FROM pgmigrations WHERE name = '9999_from_the_future'`);
  });

  describe('messages', () => {
    const message = (extra = {}) => {
      const row = {
        name: 'Ada',
        email: 'ada@example.com',
        subject: 'Hello',
        body: 'A real message.',
        ...extra,
      };
      const columns = Object.keys(row);
      return [
        `INSERT INTO messages (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id, status`,
        Object.values(row),
      ];
    };
    const fails = (sql, params, constraint) =>
      expect(db.pool.query(sql, params)).rejects.toMatchObject({ code: '23514', constraint });

    it('stores a valid message as "new" with a generated id', async () => {
      const { rows } = await db.pool.query(...message());

      expect(rows[0].status).toBe('new');
      expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('repeats the length limits of the contact form', async () => {
      await fails(...message({ body: 'short' }), 'messages_body_check');
      await fails(...message({ body: 'x'.repeat(2001) }), 'messages_body_check');
      await fails(...message({ name: '' }), 'messages_name_check');
      await fails(...message({ subject: 'x'.repeat(151) }), 'messages_subject_check');
      await db.pool.query(...message({ body: 'x'.repeat(2000) }));
    });

    it('only stores a hash, never an address', async () => {
      await db.pool.query(...message({ ip_hash: 'a'.repeat(64) }));
      await fails(...message({ ip_hash: '203.0.113.7' }), 'messages_ip_hash_check');
    });

    it('only knows the three statuses', async () => {
      await fails(...message({ status: 'deleted' }), 'messages_status_check');
    });
  });

  it('can put the removed content tables back, and take them away again, without touching messages', async () => {
    const before = await db.pool.query('SELECT count(*)::int AS n FROM messages');

    await migrate({ direction: 'down', count: 1 });

    expect(await tables()).toEqual([...TABLES, ...REMOVED_CONTENT_TABLES].sort());
    expect(await functions()).toContain('set_updated_at');
    // The restored tables work as they did: new projects start hidden and updated_at is kept.
    await db.pool.query(
      `INSERT INTO projects (slug, title, summary) VALUES ('restored', 'T', 'S')`,
    );
    const { rows } = await db.pool.query(
      `SELECT is_published FROM projects WHERE slug = 'restored'`,
    );
    expect(rows[0].is_published).toBe(false);
    const after = await db.pool.query('SELECT count(*)::int AS n FROM messages');
    expect(after.rows[0].n).toBe(before.rows[0].n);

    await db.pool.query(`DELETE FROM projects WHERE slug = 'restored'`);
    expect(await migrate()).toHaveLength(1);
    expect(await tables()).toEqual(TABLES);
  });

  it('reverts every migration and leaves nothing behind, then applies again', async () => {
    const reverted = await migrate({ direction: 'down', count: Infinity });

    expect(reverted).toHaveLength((await listMigrationFiles()).length);
    expect(await tables()).toEqual(['pgmigrations']);
    expect(await functions()).toEqual([]);

    await migrate();
    expect(await tables()).toEqual(TABLES);
  });
});
