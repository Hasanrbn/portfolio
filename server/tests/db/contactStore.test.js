import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { parseEnv } from '../../src/config/env.js';
import { pingDatabase } from '../../src/db/pool.js';
import { createPgContactStore } from '../../src/repositories/contactMessages.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';
import { createFakeLogger } from '../helpers/logger.js';

const message = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'I would like to talk about a project.',
};

describe.skipIf(!TEST_DATABASE_URL)('contact messages in PostgreSQL', () => {
  let db;
  let store;

  beforeAll(async () => {
    db = await createTestDatabase();
    store = createPgContactStore({ pool: db.pool, listLimit: 3 });
  });
  afterAll(() => db.drop());

  it('saves a message and answers with its id and time', async () => {
    const result = await store.create({ ...message, ipHash: 'a'.repeat(64) });

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
  });

  it('lists newest first in the same shape as the other stores', async () => {
    await db.pool.query('DELETE FROM messages');
    const first = await store.create({ ...message, subject: 'First' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await store.create({ ...message, subject: 'Second', ipHash: 'b'.repeat(64) });

    const list = await store.list();

    expect(list.map((record) => record.id)).toEqual([second.id, first.id]);
    expect(list[0]).toEqual({
      id: second.id,
      ...message,
      subject: 'Second',
      status: 'new',
      ipHash: 'b'.repeat(64),
      createdAt: second.createdAt,
    });
    expect(list[1].ipHash).toBeNull();
  });

  it('returns at most the configured number of messages', async () => {
    for (let i = 0; i < 5; i += 1) {
      await store.create(message);
    }

    expect(await store.list()).toHaveLength(3);
  });

  it('stores text that looks like SQL as plain text', async () => {
    const attack = "'); DROP TABLE messages; --";

    await store.create({ ...message, subject: attack, message: `${attack} and more text` });

    const { rows } = await db.pool.query('SELECT subject FROM messages WHERE subject = $1', [
      attack,
    ]);
    expect(rows).toHaveLength(1);
    expect(
      (await db.pool.query('SELECT count(*)::int AS n FROM messages')).rows[0].n,
    ).toBeGreaterThan(0);
  });

  it('refuses what the database limits forbid, even if the layers above let it through', async () => {
    await expect(store.create({ ...message, message: 'short' })).rejects.toMatchObject({
      constraint: 'messages_body_check',
    });
    await expect(store.create({ ...message, ipHash: '203.0.113.7' })).rejects.toMatchObject({
      constraint: 'messages_ip_hash_check',
    });
  });

  describe('through the API', () => {
    const buildApp = (pool, checkReady) =>
      createApp({
        env: parseEnv({ NODE_ENV: 'test', IP_HASH_SALT: 'a-long-enough-test-salt' }),
        logger: createFakeLogger(),
        contactStore: createPgContactStore({ pool }),
        checkReady,
        contactRateLimit: (req, res, next) => next(),
      });

    it('POST /api/contact stores the message with a hashed address, never the address', async () => {
      await db.pool.query('DELETE FROM messages');
      const app = buildApp(db.pool);

      const response = await request(app)
        .post('/api/contact')
        .set('X-Forwarded-For', '203.0.113.7')
        .send(message);

      expect(response.status).toBe(201);
      const { rows } = await db.pool.query('SELECT * FROM messages');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        body: message.message,
        status: 'new',
      });
      expect(rows[0].ip_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(rows[0])).not.toContain('203.0.113.7');
    });

    it('answers a generic 500 (without database details) when the database fails', async () => {
      const broken = {
        query: () => Promise.reject(new Error('connection to server at "10.0.0.5" failed')),
      };
      const app = buildApp(broken);

      const response = await request(app).post('/api/contact').send(message);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, message: 'Something went wrong.' });
      expect(JSON.stringify(response.body)).not.toContain('10.0.0.5');
    });

    it('GET /readyz is ready while the database answers and 503 once it does not', async () => {
      const own = await createTestDatabase({ migrate: false });
      const app = buildApp(own.pool, () => pingDatabase(own.pool, 500));

      expect((await request(app).get('/readyz')).body.data).toEqual({
        status: 'ready',
        database: 'up',
      });

      await own.pool.end();

      const down = await request(app).get('/readyz');
      expect(down.status).toBe(503);
      await expect(own.drop())
        .resolves.toBeUndefined()
        .catch(() => {});
    });
  });
});
