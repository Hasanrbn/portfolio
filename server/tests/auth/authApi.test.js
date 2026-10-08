import session from 'express-session';
import { Router } from 'express';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createLoginRateLimit, createCsrfRateLimit } from '../../src/routes/auth.js';
import { createLoginThrottle } from '../../src/services/loginThrottle.js';
import { sendSuccess } from '../../src/utils/respond.js';
import { createCapturingLogger } from '../helpers/logger.js';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  buildAuthApp,
  sessionCookie,
  signIn,
  testEnv,
  tokenFrom,
} from '../helpers/auth.js';

const INVALID = { success: false, message: 'Invalid email or password.' };

/** A stand-in for the admin resources of Phase 14: one read, one write, one delete. */
function probeRoutes() {
  const router = Router();
  router.get('/', (req, res) => sendSuccess(res, { items: [], by: req.user.email }));
  router.post('/', (req, res) => sendSuccess(res, { created: true }, 201));
  router.delete('/:id', (req, res) => res.status(204).end());
  return [{ path: '/probe', router }];
}

describe('GET /api/csrf-token', () => {
  it('gives a token, starts a private session, and is never cached', async () => {
    const { app } = await buildAuthApp();

    const response = await request(app).get('/api/csrf-token');

    expect(response.status).toBe(200);
    expect(response.body.data.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.headers['cache-control']).toBe('no-store');
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toMatch(/^portfolio\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it('keeps the same token inside one session and gives another session another token', async () => {
    const { app } = await buildAuthApp();
    const agent = request.agent(app);

    const first = await agent.get('/api/csrf-token');
    const second = await agent.get('/api/csrf-token');
    const stranger = await request(app).get('/api/csrf-token');

    expect(tokenFrom(second)).toBe(tokenFrom(first));
    expect(tokenFrom(stranger)).not.toBe(tokenFrom(first));
  });

  it('is rate limited, so it cannot be used to fill the session table', async () => {
    const { app } = await buildAuthApp({ csrfRateLimit: createCsrfRateLimit({ limit: 2 }) });

    const statuses = [];
    for (let i = 0; i < 3; i += 1) {
      statuses.push((await request(app).get('/api/csrf-token')).status);
    }

    expect(statuses).toEqual([200, 200, 429]);
  });
});

describe('POST /api/auth/login', () => {
  it('signs the admin in, returns the public user and a fresh CSRF token, and no hash', async () => {
    const { app, user } = await buildAuthApp();

    const { response, csrfToken } = await signIn(app);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      success: true,
      data: { user: { id: user.id, email: ADMIN_EMAIL, role: 'admin' }, csrfToken },
    });
    expect(response.text).not.toMatch(/argon2|passwordHash|password_hash/);
  });

  it('refuses without a CSRF token, or with a wrong one, and does not even look at the password', async () => {
    const { app } = await buildAuthApp();
    const agent = request.agent(app);
    await agent.get('/api/csrf-token');
    const body = { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };

    const missing = await agent.post('/api/auth/login').send(body);
    const wrong = await agent.post('/api/auth/login').set('X-CSRF-Token', 'nope').send(body);
    const noSession = await request(app)
      .post('/api/auth/login')
      .set('X-CSRF-Token', 'nope')
      .send(body);

    for (const response of [missing, wrong, noSession]) {
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ success: false, message: 'Invalid or missing CSRF token' });
    }
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const { app } = await buildAuthApp();
    const agent = request.agent(app);
    const token = tokenFrom(await agent.get('/api/csrf-token'));
    const attempt = (body) => agent.post('/api/auth/login').set('X-CSRF-Token', token).send(body);

    const wrongPassword = await attempt({ email: ADMIN_EMAIL, password: 'not the password' });
    const unknownEmail = await attempt({ email: 'nobody@example.com', password: ADMIN_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(INVALID);
    expect(unknownEmail.body).toEqual(INVALID);
  });

  it('accepts the email in any letter case and with spaces around it', async () => {
    const { app } = await buildAuthApp();

    const { response } = await signIn(app, { email: `  ${ADMIN_EMAIL.toUpperCase()} ` });

    expect(response.status).toBe(200);
  });

  it('answers 422 with a message per field when the body has the wrong shape', async () => {
    const { app } = await buildAuthApp();
    const agent = request.agent(app);
    const token = tokenFrom(await agent.get('/api/csrf-token'));

    const empty = await agent.post('/api/auth/login').set('X-CSRF-Token', token).send({});
    const wrongTypes = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: ['a@b.c'], password: { $ne: '' } });

    expect(empty.status).toBe(422);
    expect(empty.body.errors).toEqual([
      { field: 'email', message: 'Enter your email address.' },
      { field: 'password', message: 'Enter your password.' },
    ]);
    expect(wrongTypes.status).toBe(422);
  });

  it('replaces the session id and the CSRF token at sign-in, so an id known before is useless', async () => {
    const { app } = await buildAuthApp();
    const agent = request.agent(app);
    const before = await agent.get('/api/csrf-token');
    const oldCookie = sessionCookie(before);
    const oldToken = tokenFrom(before);

    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', oldToken)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const newCookie = sessionCookie(login);

    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(oldCookie);
    expect(tokenFrom(login)).not.toBe(oldToken);
    // Someone who planted the old id gets nothing out of the login.
    const fixation = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(fixation.status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', newCookie)).status).toBe(200);
  });

  it('records the time of the sign-in', async () => {
    const { app, userStore, user } = await buildAuthApp();
    expect((await userStore.findById(user.id)).lastLoginAt).toBeNull();

    await signIn(app);

    expect((await userStore.findById(user.id)).lastLoginAt).not.toBeNull();
  });

  describe('against guessing', () => {
    it('blocks an email after too many failures, even for the right password, and says when to retry', async () => {
      const { app } = await buildAuthApp({ loginThrottle: createLoginThrottle({ limit: 3 }) });
      const agent = request.agent(app);
      const token = tokenFrom(await agent.get('/api/csrf-token'));
      const attempt = (email, password) =>
        agent.post('/api/auth/login').set('X-CSRF-Token', token).send({ email, password });

      for (let i = 0; i < 3; i += 1) {
        expect((await attempt(ADMIN_EMAIL, `wrong guess ${i}`)).status).toBe(401);
      }
      const blocked = await attempt(ADMIN_EMAIL, ADMIN_PASSWORD);
      const other = await attempt('someone-else@example.com', 'whatever it is');

      expect(blocked.status).toBe(429);
      expect(blocked.body).toEqual({
        success: false,
        message: 'Too many failed attempts. Please try again later.',
      });
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
      // Other addresses are not affected.
      expect(other.status).toBe(401);
      expect((await agent.get('/api/auth/me')).status).toBe(401);
    });

    it('blocks an address that has no account in exactly the same way', async () => {
      const { app } = await buildAuthApp({ loginThrottle: createLoginThrottle({ limit: 2 }) });
      const agent = request.agent(app);
      const token = tokenFrom(await agent.get('/api/csrf-token'));
      const attempt = () =>
        agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', token)
          .send({ email: 'ghost@example.com', password: 'a guess at it' });

      const statuses = [(await attempt()).status, (await attempt()).status];
      const blocked = await attempt();

      expect(statuses).toEqual([401, 401]);
      expect(blocked.status).toBe(429);
    });

    it('forgets earlier failures after a correct password', async () => {
      const { app } = await buildAuthApp({ loginThrottle: createLoginThrottle({ limit: 3 }) });
      // A successful sign-in replaces the session (and its token), so every attempt starts
      // from a fresh browser.
      const attempt = async (password) => {
        const agent = request.agent(app);
        const token = tokenFrom(await agent.get('/api/csrf-token'));
        return agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', token)
          .send({ email: ADMIN_EMAIL, password });
      };

      await attempt('wrong 1');
      await attempt('wrong 2');
      expect((await attempt(ADMIN_PASSWORD)).status).toBe(200);
      await attempt('wrong 3');
      await attempt('wrong 4');
      // Two failures since the success, below the limit of three.
      expect((await attempt(ADMIN_PASSWORD)).status).toBe(200);
    });

    it('limits one visitor by address, whichever email is tried, before anything else is checked', async () => {
      const { app } = await buildAuthApp({ loginRateLimit: createLoginRateLimit({ limit: 3 }) });
      const agent = request.agent(app);
      const token = tokenFrom(await agent.get('/api/csrf-token'));

      const statuses = [];
      for (let i = 0; i < 4; i += 1) {
        const response = await agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', token)
          .send({ email: `user${i}@example.com`, password: 'a guess at it' });
        statuses.push(response.status);
      }

      expect(statuses).toEqual([401, 401, 401, 429]);
    });
  });

  it('writes neither the password nor the email to the log', async () => {
    const capture = createCapturingLogger({ level: 'debug' });
    const { app } = await buildAuthApp({ logger: capture.logger });
    const agent = request.agent(app);
    const token = tokenFrom(await agent.get('/api/csrf-token'));

    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'typo-address@example.com', password: 'a wrong-guess-1234' });
    const ok = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(ok.status).toBe(200);
    for (const secret of [
      'wrong-guess-1234',
      ADMIN_PASSWORD,
      ADMIN_EMAIL,
      'typo-address',
      tokenFrom(ok),
    ]) {
      expect(capture.raw()).not.toContain(secret);
    }
    expect(capture.lines().some((line) => line.msg === 'admin signed in')).toBe(true);
  });
});

describe('GET /api/auth/me and POST /api/auth/logout', () => {
  it('says 401 when nobody is signed in, and who is signed in otherwise', async () => {
    const { app, user } = await buildAuthApp();
    expect((await request(app).get('/api/auth/me')).status).toBe(401);

    const { agent } = await signIn(app);
    const me = await agent.get('/api/auth/me');

    expect(me.status).toBe(200);
    expect(me.headers['cache-control']).toBe('no-store');
    expect(me.body.data).toEqual({ user: { id: user.id, email: ADMIN_EMAIL, role: 'admin' } });
  });

  it('ends the session on the server and clears the cookie', async () => {
    const { app } = await buildAuthApp();
    const { agent, response, csrfToken } = await signIn(app);
    const cookie = sessionCookie(response);

    const out = await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken);

    expect(out.status).toBe(204);
    expect(out.headers['set-cookie'].join(';')).toMatch(
      /portfolio\.sid=;.*Expires=Thu, 01 Jan 1970/i,
    );
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    // A copy of the old cookie, kept by someone else, is dead too: the session is gone server-side.
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  it('needs the CSRF token to sign out, so another site cannot do it', async () => {
    const { app } = await buildAuthApp();
    const { agent } = await signIn(app);

    const refused = await agent.post('/api/auth/logout');

    expect(refused.status).toBe(403);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });
});

describe('/api/admin guard', () => {
  const build = (options = {}) => buildAuthApp({ adminRoutes: probeRoutes(), ...options });

  it('answers 401 to everybody who is not signed in, for every method and even for unknown paths', async () => {
    const { app } = await build();

    const responses = await Promise.all([
      request(app).get('/api/admin/probe'),
      request(app).post('/api/admin/probe').send({}),
      request(app).delete('/api/admin/probe/1'),
      request(app).get('/api/admin/does-not-exist'),
      request(app).put('/api/admin'),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ success: false, message: 'Authentication required' });
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });

  it('answers 403 to a signed-in admin who sends a write without the CSRF token, or with a wrong one', async () => {
    const { app } = await build();
    const { agent } = await signIn(app);

    const without = await agent.post('/api/admin/probe').send({});
    const wrong = await agent.post('/api/admin/probe').set('X-CSRF-Token', 'x'.repeat(43)).send({});
    const del = await agent.delete('/api/admin/probe/1');

    for (const response of [without, wrong, del]) {
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Invalid or missing CSRF token');
    }
  });

  it('lets reads through without a token, and writes with the right one', async () => {
    const { app } = await build();
    const { agent, csrfToken } = await signIn(app);

    const read = await agent.get('/api/admin/probe');
    const created = await agent.post('/api/admin/probe').set('X-CSRF-Token', csrfToken).send({});
    const removed = await agent.delete('/api/admin/probe/1').set('X-CSRF-Token', csrfToken);

    expect(read.status).toBe(200);
    expect(read.body.data.by).toBe(ADMIN_EMAIL);
    expect(created.status).toBe(201);
    expect(removed.status).toBe(204);
  });

  it('does not accept a token that belongs to another session', async () => {
    const { app } = await build();
    const { agent } = await signIn(app);
    const { csrfToken: foreignToken } = await signIn(app);

    const response = await agent
      .post('/api/admin/probe')
      .set('X-CSRF-Token', foreignToken)
      .send({});

    expect(response.status).toBe(403);
  });

  it('keeps the token from before sign-in useless afterwards', async () => {
    const { app } = await build();
    const agent = request.agent(app);
    const before = tokenFrom(await agent.get('/api/csrf-token'));
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', before)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    const response = await agent.post('/api/admin/probe').set('X-CSRF-Token', before).send({});

    expect(response.status).toBe(403);
  });

  it('answers 404 for an unknown admin path once signed in (the guard does not swallow it)', async () => {
    const { app } = await build();
    const { agent } = await signIn(app);

    expect((await agent.get('/api/admin/does-not-exist')).status).toBe(404);
  });

  it('stops working the moment the account is deleted', async () => {
    const { app, userStore } = await build();
    const { agent } = await signIn(app);
    expect((await agent.get('/api/admin/probe')).status).toBe(200);
    const findById = userStore.findById;
    userStore.findById = async () => null;

    const response = await agent.get('/api/admin/probe');
    userStore.findById = findById;

    expect(response.status).toBe(401);
    // The orphaned session was destroyed, not just ignored.
    expect((await agent.get('/api/admin/probe')).status).toBe(401);
  });

  it('refuses an account whose role is not admin', async () => {
    const { app, userStore } = await build();
    const { agent } = await signIn(app);
    const findById = userStore.findById;
    userStore.findById = async (id) => ({ ...(await findById(id)), role: 'editor' });

    const response = await agent.get('/api/admin/probe');

    expect(response.status).toBe(403);
  });

  it('fails closed with a generic 500 when the session store is down', async () => {
    class FlakyStore extends session.MemoryStore {
      broken = false;
      get(sid, callback) {
        if (this.broken) return callback(new Error('connection to 10.0.0.5 refused'));
        return super.get(sid, callback);
      }
    }
    const store = new FlakyStore();
    const { app } = await build({ sessionStore: store });
    const { agent } = await signIn(app);

    store.broken = true;
    const response = await agent.get('/api/admin/probe');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Something went wrong.' });
    expect(response.text).not.toContain('10.0.0.5');
  });
});

describe('the session cookie', () => {
  const production = {
    NODE_ENV: 'production',
    SITE_URL: 'https://example.org',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/portfolio',
    TRUST_PROXY_HOPS: '1',
    LOG_LEVEL: 'silent',
  };

  it('is __Host- prefixed, Secure, HttpOnly, SameSite=Lax and limited to / in production', async () => {
    const { app } = await buildAuthApp({ envOverrides: production });

    const response = await request(app).get('/api/csrf-token').set('X-Forwarded-Proto', 'https');

    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toMatch(/^__Host-portfolio\.sid=/);
    expect(cookie).toMatch(/; Path=\//);
    expect(cookie).toMatch(/; HttpOnly/i);
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).toMatch(/; SameSite=Lax/i);
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it('expires after the idle time from the environment', async () => {
    const { app } = await buildAuthApp({ envOverrides: { SESSION_IDLE_HOURS: '2' } });

    const response = await request(app).get('/api/csrf-token');

    const expires = /Expires=([^;]+)/.exec(response.headers['set-cookie'][0])[1];
    const hours = (new Date(expires).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(1.9);
    expect(hours).toBeLessThanOrEqual(2);
  });

  it('ignores a cookie that was not signed by this server', async () => {
    const { app } = await buildAuthApp();
    const forged =
      'portfolio.sid=s%3Aforged-session-id.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    const response = await request(app).get('/api/auth/me').set('Cookie', forged);

    expect(response.status).toBe(401);
  });

  it('is never set for the public pages and the contact form, which need no session', async () => {
    const { app } = await buildAuthApp();

    const health = await request(app).get('/healthz');
    const contact = await request(app).post('/api/contact').send({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'Hello',
      message: 'A message long enough.',
    });

    expect(health.headers['set-cookie']).toBeUndefined();
    // The contact form needs no CSRF token (nothing is signed in there to be abused).
    expect(contact.status).toBe(201);
    expect(contact.headers['set-cookie']).toBeUndefined();
  });

  it('makes the server refuse to start in production without a SESSION_SECRET', async () => {
    expect(() => testEnv({ ...production, SESSION_SECRET: undefined })).toThrow(/SESSION_SECRET/);
  });
});

describe('without a configured secret', () => {
  it('still works with a random one made for this process', async () => {
    const { app } = await buildAuthApp();
    const bare = createApp({ env: testEnv({ SESSION_SECRET: undefined }), logger: undefined });

    expect((await request(app).get('/api/csrf-token')).status).toBe(200);
    expect((await request(bare).get('/api/csrf-token')).status).toBe(200);
  });
});
