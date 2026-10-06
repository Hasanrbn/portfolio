import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPool, pingDatabase } from '../src/db/pool.js';
import { assertMigrated, getMigrationStatus, listMigrationFiles } from '../src/db/migrate.js';
import { createFakeLogger } from './helpers/logger.js';

describe('createPool', () => {
  it('needs a connection string', () => {
    expect(() => createPool({ connectionString: '' })).toThrow(/connection string/);
  });

  it('logs an error on an idle connection instead of crashing the process', async () => {
    const logger = createFakeLogger();
    const pool = createPool({ connectionString: 'postgres://u:p@localhost:1/db', logger });

    expect(() => pool.emit('error', new Error('connection reset'))).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('idle database connection'),
    );
    await pool.end();
  });

  it('sets a query timeout and a connection limit', async () => {
    const pool = createPool({ connectionString: 'postgres://u:p@localhost:1/db' });

    expect(pool.options).toMatchObject({
      max: 10,
      statement_timeout: 10_000,
      connectionTimeoutMillis: 5_000,
      application_name: 'portfolio-api',
    });
    await pool.end();
  });
});

describe('pingDatabase', () => {
  it('is true when the query succeeds', async () => {
    expect(await pingDatabase({ query: vi.fn().mockResolvedValue({}) })).toBe(true);
  });

  it('is false when the query fails, without throwing', async () => {
    expect(await pingDatabase({ query: vi.fn().mockRejectedValue(new Error('down')) })).toBe(false);
  });

  it('is false when the database does not answer in time', async () => {
    const hanging = { query: () => new Promise(() => {}) };

    expect(await pingDatabase(hanging, 20)).toBe(false);
  });
});

describe('migration status (without a database)', () => {
  const dirs = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });
  async function migrationsDir(...names) {
    const dir = await mkdtemp(path.join(tmpdir(), 'portfolio-migrations-'));
    dirs.push(dir);
    for (const name of names) await writeFile(path.join(dir, `${name}.js`), '');
    await writeFile(path.join(dir, 'README.md'), 'not a migration');
    return dir;
  }

  it('lists migration files oldest first and ignores other files', async () => {
    const dir = await migrationsDir('0002_b', '0001_a');

    expect(await listMigrationFiles(dir)).toEqual(['0001_a', '0002_b']);
  });

  it('treats a missing migrations table as "nothing applied"', async () => {
    const dir = await migrationsDir('0001_a');
    const pool = {
      query: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: '42P01' })),
    };

    expect(await getMigrationStatus(pool, dir)).toEqual({
      applied: [],
      pending: ['0001_a'],
      unknown: [],
    });
  });

  it('does not hide other database errors', async () => {
    const dir = await migrationsDir('0001_a');
    const pool = {
      query: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('permission denied'), { code: '42501' })),
    };

    await expect(getMigrationStatus(pool, dir)).rejects.toThrow('permission denied');
  });

  it('tells how to fix pending migrations, and refuses a database that is ahead of the code', async () => {
    const dir = await migrationsDir('0001_a', '0002_b');
    const pending = { query: vi.fn().mockResolvedValue({ rows: [{ name: '0001_a' }] }) };
    const ahead = {
      query: vi
        .fn()
        .mockResolvedValue({ rows: [{ name: '0001_a' }, { name: '0002_b' }, { name: '0003_c' }] }),
    };
    const current = {
      query: vi.fn().mockResolvedValue({ rows: [{ name: '0001_a' }, { name: '0002_b' }] }),
    };

    await expect(assertMigrated(pending, dir)).rejects.toThrow(/0002_b.*db:migrate/);
    await expect(assertMigrated(ahead, dir)).rejects.toThrow(/0003_c/);
    await expect(assertMigrated(current, dir)).resolves.toBeUndefined();
  });
});
