import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { importContactMessages } from '../../src/db/importContactMessages.js';
import { createPgContactStore } from '../../src/repositories/contactMessages.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

const record = (overrides = {}) => ({
  id: '3f1c2a52-8f0e-4c53-9c5a-0a1b2c3d4e5f',
  name: 'Ada',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'I would like to talk about a project.',
  status: 'new',
  ipHash: null,
  createdAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
});

const lines = (...items) =>
  `${items.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n')}\n`;

describe.skipIf(!TEST_DATABASE_URL)('importContactMessages', () => {
  let database;
  let pool;
  let directory;
  let file;

  beforeAll(async () => {
    database = await createTestDatabase();
    pool = database.pool;
    directory = await mkdtemp(path.join(tmpdir(), 'import-messages-'));
    file = path.join(directory, 'contact-messages.jsonl');
  });
  afterAll(async () => {
    await database.drop();
    await rm(directory, { recursive: true, force: true });
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE messages');
  });

  it('copies messages with their ids, dates and status', async () => {
    await writeFile(
      file,
      lines(
        record(),
        record({
          id: '9a8b7c6d-1111-4222-8333-444455556666',
          status: 'read',
          ipHash: 'ab'.repeat(32),
          createdAt: '2026-05-02T10:00:00.000Z',
        }),
      ),
    );

    const result = await importContactMessages(pool, file);

    expect(result).toEqual({ imported: 2, alreadyThere: 0, skipped: 0 });
    const list = await createPgContactStore({ pool }).list();
    expect(list.map((item) => [item.id, item.status, item.ipHash, item.createdAt])).toEqual([
      ['9a8b7c6d-1111-4222-8333-444455556666', 'read', 'ab'.repeat(32), '2026-05-02T10:00:00.000Z'],
      ['3f1c2a52-8f0e-4c53-9c5a-0a1b2c3d4e5f', 'new', null, '2026-05-01T10:00:00.000Z'],
    ]);
  });

  it('can be run again without duplicating messages', async () => {
    await writeFile(file, lines(record()));

    await importContactMessages(pool, file);
    const again = await importContactMessages(pool, file);

    expect(again).toEqual({ imported: 0, alreadyThere: 1, skipped: 0 });
    expect((await pool.query('SELECT count(*) FROM messages')).rows[0].count).toBe('1');
  });

  it('skips damaged, invalid and badly identified lines and imports the rest', async () => {
    await writeFile(
      file,
      lines(
        '{"cut off',
        record({ message: 'short' }),
        record({ id: 'not-a-uuid' }),
        record({ createdAt: 'yesterday' }),
        record({ id: '9a8b7c6d-1111-4222-8333-444455556666', status: 'weird' }),
      ),
    );

    const result = await importContactMessages(pool, file);

    expect(result).toEqual({ imported: 1, alreadyThere: 0, skipped: 4 });
    expect((await createPgContactStore({ pool }).list())[0].status).toBe('new');
  });

  it('drops an IP hash the table would refuse instead of failing the import', async () => {
    await writeFile(file, lines(record({ ipHash: 'not-a-sha256-hash' })));

    const result = await importContactMessages(pool, file);

    expect(result).toEqual({ imported: 1, alreadyThere: 0, skipped: 0 });
    expect((await createPgContactStore({ pool }).list())[0].ipHash).toBeNull();
  });

  it('says so when there is no file to import', async () => {
    const result = await importContactMessages(pool, path.join(directory, 'missing.jsonl'));

    expect(result).toMatchObject({ imported: 0, missing: true });
  });
});
