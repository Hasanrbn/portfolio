import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createPgSessionStore, revokeUserSessions } from '../../src/repositories/sessions.js';
import { DuplicateEmailError, createPgUserStore } from '../../src/repositories/users.js';
import { createAdminAccount, resetAdminPassword } from '../../src/services/adminAccountService.js';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  cheapPasswordService,
  sessionCookie,
  signIn,
  testEnv,
} from '../helpers/auth.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';
import { createFakeLogger } from '../helpers/logger.js';

const HASH = '$argon2id$v=19$m=64,t=1,p=1$c29tZXNhbHQ$aGFzaGhhc2hoYXNoaGFzaGhhc2g';

describe.skipIf(!TEST_DATABASE_URL)('authentication with PostgreSQL', () => {
  let db;
  let userStore;
  let sessionStore;
  let passwordService;

  beforeAll(async () => {
    db = await createTestDatabase();
    userStore = createPgUserStore({ pool: db.pool });
    sessionStore = createPgSessionStore({ pool: db.pool, pruneIntervalSeconds: false });
    passwordService = cheapPasswordService();
  });
  afterAll(async () => {
    sessionStore.close();
    await db.drop();
  });

  const buildApp = () =>
    createApp({
      env: testEnv(),
      logger: createFakeLogger(),
      userStore,
      sessionStore,
      passwordService,
      adminRoutes: [],
    });
  const rows = async (sql, params) => (await db.pool.query(sql, params)).rows;

  describe('users table', () => {
    const insert = (email, hash = HASH, extra = {}) => {
      const row = { email, password_hash: hash, ...extra };
      const columns = Object.keys(row);
      return db.pool.query(
        `INSERT INTO users (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})`,
        Object.values(row),
      );
    };
    const refuses = (promise, constraint) =>
      expect(promise).rejects.toMatchObject({ code: expect.stringMatching(/^23/), constraint });

    it('only stores an email in its one lower-case, trimmed spelling, and only once', async () => {
      await insert('table-check@example.com');

      await refuses(insert('Table-Check@Example.com'), 'users_email_check');
      await refuses(insert(' padded@example.com'), 'users_email_check');
      await refuses(insert('ab'), 'users_email_check');
      await refuses(insert('table-check@example.com'), 'users_email_key');
    });

    it('only stores an argon2id hash, never a plain password', async () => {
      await refuses(insert('plain@example.com', 'my password'), 'users_password_hash_check');
      await refuses(
        insert('md5@example.com', '$2b$12$abcdefghijklmnopqrstuv'),
        'users_password_hash_check',
      );
    });

    it('only knows the admin role, and defaults to it', async () => {
      await refuses(insert('boss@example.com', HASH, { role: 'owner' }), 'users_role_check');
      await insert('default-role@example.com');
      const [row] = await rows(`SELECT role FROM users WHERE email = 'default-role@example.com'`);
      expect(row.role).toBe('admin');
    });

    it('keeps updated_at current by itself', async () => {
      await insert('touch@example.com');
      await db.pool.query(
        `UPDATE users SET updated_at = now() - interval '1 day' WHERE email = 'touch@example.com'`,
      );
      await db.pool.query(
        `UPDATE users SET last_login_at = now() WHERE email = 'touch@example.com'`,
      );

      const [row] = await rows(
        `SELECT now() - updated_at < interval '1 minute' AS fresh FROM users WHERE email = 'touch@example.com'`,
      );
      expect(row.fresh).toBe(true);
    });
  });

  describe('user store', () => {
    it('creates, finds by email (any case) and by id, and refuses a duplicate', async () => {
      const created = await userStore.create({
        email: 'Store.Test@Example.com',
        passwordHash: HASH,
      });

      expect(created).toMatchObject({ email: 'store.test@example.com', role: 'admin' });
      expect(await userStore.findByEmail(' STORE.TEST@example.com ')).toEqual(created);
      expect(await userStore.findById(created.id)).toEqual(created);
      expect(await userStore.findByEmail('nobody@example.com')).toBeNull();
      await expect(
        userStore.create({ email: 'store.test@example.com', passwordHash: HASH }),
      ).rejects.toBeInstanceOf(DuplicateEmailError);
    });

    it('answers "no such user" for an id that is not a UUID instead of failing', async () => {
      expect(await userStore.findById('not-a-uuid')).toBeNull();
      expect(await userStore.findById(undefined)).toBeNull();
      expect(await userStore.findById("1' OR '1'='1")).toBeNull();
    });

    it('replaces the hash and records the sign-in time', async () => {
      const user = await userStore.create({ email: 'update@example.com', passwordHash: HASH });

      expect(await userStore.updatePasswordHash(user.id, `${HASH}x`)).toBe(true);
      await userStore.recordLogin(user.id);

      const found = await userStore.findById(user.id);
      expect(found.passwordHash).toBe(`${HASH}x`);
      expect(found.lastLoginAt).not.toBeNull();
      expect(await userStore.updatePasswordHash('00000000-0000-4000-8000-000000000000', HASH)).toBe(
        false,
      );
    });

    it('treats an email with SQL in it as plain text', async () => {
      expect(await userStore.findByEmail("x@y.z' OR 1=1 --")).toBeNull();
    });
  });

  describe('sign-in through the real tables', () => {
    it('keeps the session in the session table, with the user id and no password or hash', async () => {
      await createAdminAccount({
        userStore,
        passwordService,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      const app = buildApp();

      const { response, agent } = await signIn(app);

      expect(response.status).toBe(200);
      const stored = await rows('SELECT sess, expire FROM session');
      const mine = stored.find((row) => row.sess.userId === response.body.data.user.id);
      expect(mine).toBeDefined();
      expect(mine.sess.csrfToken).toBe(response.body.data.csrfToken);
      expect(JSON.stringify(mine.sess)).not.toMatch(/argon2|password/i);
      expect(mine.expire.getTime()).toBeGreaterThan(Date.now());
      expect((await agent.get('/api/auth/me')).status).toBe(200);
    });

    it('survives a restart of the server: a new app on the same database knows the cookie', async () => {
      const { response, agent } = await signIn(buildApp());
      expect(response.status).toBe(200);
      const cookie = sessionCookie(response);

      const restarted = buildApp();
      const me = await request(restarted).get('/api/auth/me').set('Cookie', cookie);

      expect(me.status).toBe(200);
      expect(agent).toBeDefined();
    });

    it('deletes the row on sign-out, and the old cookie stops working', async () => {
      const app = buildApp();
      const { response, agent, csrfToken } = await signIn(app);
      const id = response.body.data.user.id;
      const count = async () =>
        (await rows(`SELECT count(*)::int AS n FROM session WHERE sess ->> 'userId' = $1`, [id]))[0]
          .n;
      const before = await count();

      await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken);

      expect(before).toBeGreaterThan(0);
      expect(await count()).toBe(before - 1);
      expect(
        (await request(app).get('/api/auth/me').set('Cookie', sessionCookie(response))).status,
      ).toBe(401);
    });

    it('does not hand out a session to an expired row', async () => {
      const app = buildApp();
      const { response } = await signIn(app);
      await db.pool.query(`UPDATE session SET expire = now() - interval '1 minute'`);

      const me = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(response));

      expect(me.status).toBe(401);
    });
  });

  describe('closing sessions', () => {
    it("closes every session of one user and nobody else's", async () => {
      const app = buildApp();
      const other = await createAdminAccount({
        userStore,
        passwordService,
        email: 'second-admin@example.com',
        password: 'another long password here',
      });
      const first = await signIn(app);
      const second = await signIn(app);
      const stranger = await signIn(app, {
        email: 'second-admin@example.com',
        password: 'another long password here',
      });

      const closed = await revokeUserSessions(db.pool, first.response.body.data.user.id);

      expect(closed).toBeGreaterThanOrEqual(2);
      expect((await first.agent.get('/api/auth/me')).status).toBe(401);
      expect((await second.agent.get('/api/auth/me')).status).toBe(401);
      expect((await stranger.agent.get('/api/auth/me')).status).toBe(200);
      expect(other.email).toBe('second-admin@example.com');
    });

    it('signs the admin out everywhere when the password is reset, and only the new password works', async () => {
      const app = buildApp();
      const old = await signIn(app);
      expect(old.response.status).toBe(200);

      const result = await resetAdminPassword({
        userStore,
        passwordService,
        revokeSessions: (userId) => revokeUserSessions(db.pool, userId),
        email: ADMIN_EMAIL,
        password: 'a brand new long password',
      });

      expect(result.closedSessions).toBeGreaterThanOrEqual(1);
      expect((await old.agent.get('/api/auth/me')).status).toBe(401);
      expect((await signIn(app)).response.status).toBe(401);
      expect((await signIn(app, { password: 'a brand new long password' })).response.status).toBe(
        200,
      );
    });
  });

  it('upgrades a hash made with weaker settings when the right password is used', async () => {
    const weak = cheapPasswordService({ memoryCost: 32 });
    const email = 'upgrade@example.com';
    const password = 'a long old-settings phrase';
    await createAdminAccount({ userStore, passwordService: weak, email, password });
    const before = (await userStore.findByEmail(email)).passwordHash;

    const { response } = await signIn(buildApp(), { email, password });

    expect(response.status).toBe(200);
    const after = (await userStore.findByEmail(email)).passwordHash;
    expect(after).not.toBe(before);
    expect(after).toMatch(/m=64,/);
    expect(await passwordService.verify(after, password)).toBe(true);
  });
});
