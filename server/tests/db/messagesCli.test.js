import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listMessages, pruneMessages } from '../../src/db/messages.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

const run = promisify(execFile);
const CLI = fileURLToPath(new URL('../../src/db/cli.js', import.meta.url));

describe.skipIf(!TEST_DATABASE_URL)('reading and pruning messages (PostgreSQL)', () => {
  let db;
  const insert = (subject, monthsAgo) =>
    db.pool.query(
      `INSERT INTO messages (name, email, subject, body, created_at)
       VALUES ('Ada', 'ada@example.com', $1, 'A message long enough.', now() - make_interval(months => $2::int))`,
      [subject, monthsAgo],
    );
  const count = async () =>
    (await db.pool.query('SELECT count(*)::int AS n FROM messages')).rows[0].n;

  /** Runs the real command line against the test schema. */
  async function cli(...args) {
    const url = new URL(db.connection);
    url.searchParams.set('options', `-c search_path=${db.schema}`);
    try {
      const { stdout } = await run(process.execPath, [CLI, ...args], {
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'test',
          LOG_LEVEL: 'silent',
          DATABASE_URL: url.toString(),
        },
      });
      return { code: 0, out: stdout };
    } catch (error) {
      return { code: error.code, out: `${error.stdout}${error.stderr}` };
    }
  }

  beforeAll(async () => {
    db = await createTestDatabase();
    await insert('Recent one', 0);
    await insert('Six months old', 6);
    await insert('Thirteen months old', 13);
    await insert('Two years old', 24);
  });
  afterAll(() => db.drop());

  describe('listMessages', () => {
    it('returns the newest first and honours the limit', async () => {
      const all = await listMessages(db.pool, { limit: 10 });
      const two = await listMessages(db.pool, { limit: 2 });

      expect(all.map((m) => m.subject)).toEqual([
        'Recent one',
        'Six months old',
        'Thirteen months old',
        'Two years old',
      ]);
      expect(two).toHaveLength(2);
    });

    it('refuses a limit that is not a whole number from 1 to 200', async () => {
      for (const limit of [0, -1, 201, 1.5, 'ten']) {
        await expect(listMessages(db.pool, { limit })).rejects.toThrow(/limit/);
      }
    });
  });

  describe('pruneMessages', () => {
    it('only counts by default, and deletes nothing', async () => {
      const result = await pruneMessages(db.pool, { months: 12 });

      expect(result).toEqual({ count: 2, deleted: false });
      expect(await count()).toBe(4);
    });

    it('refuses a number of months that makes no sense', async () => {
      for (const months of [0, -3, 121, 1.5, '12; DROP TABLE messages']) {
        await expect(pruneMessages(db.pool, { months, apply: true })).rejects.toThrow(/months/);
      }
      expect(await count()).toBe(4);
    });
  });

  describe('command line', () => {
    it('prints the messages', async () => {
      const { code, out } = await cli('messages');

      expect(code).toBe(0);
      expect(out).toContain('Recent one');
      expect(out).toContain('Two years old');
      expect(out).toContain('4 message(s), newest first.');
    });

    it('prints the whole text with --full and limits with --limit', async () => {
      const full = await cli('messages', '--full', '--limit', '1');

      expect(full.out).toContain('Subject: Recent one');
      expect(full.out).toContain('A message long enough.');
      expect(full.out).not.toContain('Six months old');
    });

    it('explains a bad option instead of failing with a stack trace', async () => {
      const { code, out } = await cli('messages', '--limit', 'abc');

      expect(code).toBe(1);
      expect(out).toContain('--limit needs a whole number');
      expect(out).not.toMatch(/\n\s+at /);
    });

    it('only counts without --yes, then deletes just the old ones with it', async () => {
      const dry = await cli('prune-messages', '--months', '12');
      expect(dry.out).toContain('2 message(s) are older than 12 month(s). Nothing was deleted');
      expect(await count()).toBe(4);

      const real = await cli('prune-messages', '--months', '12', '--yes');
      expect(real.out).toContain('Deleted 2 message(s) older than 12 month(s).');
      expect(await count()).toBe(2);
      const left = await listMessages(db.pool);
      expect(left.map((m) => m.subject)).toEqual(['Recent one', 'Six months old']);
    });

    it('says so when there are no messages', async () => {
      await db.pool.query('DELETE FROM messages');

      const { out } = await cli('messages');

      expect(out).toContain('No messages yet.');
    });
  });
});
