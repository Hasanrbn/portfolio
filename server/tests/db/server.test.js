import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPgUserStore } from '../../src/repositories/users.js';
import { createAdminAccount } from '../../src/services/adminAccountService.js';
import { createPasswordService } from '../../src/services/passwordService.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

// Starts the real server process (src/server.js), the way `npm start` does.

const SERVER_FILE = fileURLToPath(new URL('../../src/server.js', import.meta.url));
const STARTUP_TIMEOUT_MS = 15_000;

async function freePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  probe.close();
  await once(probe, 'close');
  return port;
}

/** The test database address, pointed at one private schema. */
function addressFor(database) {
  const url = new URL(database.connection);
  url.searchParams.set('options', `-c search_path=${database.schema}`);
  return url.toString();
}

function startServer(env) {
  const child = spawn(process.execPath, [SERVER_FILE], {
    // Only what the test passes: the developer's own .env must not leak into the child.
    env: { PATH: process.env.PATH, NODE_ENV: 'test', LOG_LEVEL: 'info', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const exited = once(child, 'exit').then(([code]) => code);

  async function waitFor(text) {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (!output.includes(text)) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for "${text}". Output:\n${output}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return { child, exited, waitFor, output: () => output };
}

describe.skipIf(!TEST_DATABASE_URL)('server process', () => {
  let database;
  let unmigrated;

  beforeAll(async () => {
    database = await createTestDatabase();
    unmigrated = await createTestDatabase({ migrate: false });
  });
  afterAll(async () => {
    await database.drop();
    await unmigrated.drop();
  });

  it('starts, stores a contact message in PostgreSQL, and shuts down cleanly on SIGTERM', async () => {
    const port = await freePort();
    const server = startServer({ PORT: String(port), DATABASE_URL: addressFor(database) });

    try {
      await server.waitFor('Server listening');

      const response = await fetch(`http://127.0.0.1:${port}/api/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Ada',
          email: 'ada@example.com',
          subject: 'Hello',
          message: 'I would like to talk about a project.',
        }),
      });
      expect(response.status).toBe(201);

      const { rows } = await database.pool.query('SELECT name, body FROM messages');
      expect(rows).toEqual([{ name: 'Ada', body: 'I would like to talk about a project.' }]);
    } finally {
      server.child.kill('SIGTERM');
    }

    expect(await server.exited).toBe(0);
    expect(server.output()).toContain('shutting down');
  });

  it('signs an admin in over HTTP with the real stores and still shuts down cleanly', async () => {
    const email = 'real-server@example.com';
    const password = 'a long passphrase for this test';
    await createAdminAccount({
      userStore: createPgUserStore({ pool: database.pool }),
      passwordService: createPasswordService(),
      email,
      password,
    });
    const port = await freePort();
    const server = startServer({
      PORT: String(port),
      DATABASE_URL: addressFor(database),
      SESSION_SECRET: 'a-test-secret-that-is-at-least-32-characters',
    });
    const url = (path) => `http://127.0.0.1:${port}${path}`;
    const cookieOf = (response) => response.headers.getSetCookie()[0].split(';')[0];

    try {
      await server.waitFor('Server listening');

      const tokenResponse = await fetch(url('/api/csrf-token'));
      const { csrfToken } = (await tokenResponse.json()).data;
      const anonymous = cookieOf(tokenResponse);

      const refused = await fetch(url('/api/auth/login'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: anonymous },
        body: JSON.stringify({ email, password }),
      });
      expect(refused.status).toBe(403);

      const login = await fetch(url('/api/auth/login'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: anonymous,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });
      expect(login.status).toBe(200);
      const signedIn = cookieOf(login);
      expect(signedIn).not.toBe(anonymous);

      const me = await fetch(url('/api/auth/me'), { headers: { cookie: signedIn } });
      expect((await me.json()).data.user.email).toBe(email);
      expect((await fetch(url('/api/admin/anything'))).status).toBe(401);
      // The password and the token never appear in the log.
      expect(server.output()).not.toContain(password);
      expect(server.output()).not.toContain(csrfToken);
    } finally {
      server.child.kill('SIGTERM');
    }

    expect(await server.exited).toBe(0);
  });

  it('refuses to start when the tables have not been created, and says what to run', async () => {
    const server = startServer({
      PORT: String(await freePort()),
      DATABASE_URL: addressFor(unmigrated),
    });

    expect(await server.exited).toBe(1);
    expect(server.output()).toMatch(/npm run db:migrate/);
  });

  it('refuses to start when the database cannot be reached', async () => {
    const unreachable = new URL(database.connection);
    unreachable.port = String(await freePort());
    const server = startServer({
      PORT: String(await freePort()),
      DATABASE_URL: unreachable.toString(),
    });

    expect(await server.exited).toBe(1);
    expect(server.output()).toMatch(/database is not ready/);
    // The password in the address must never reach the log.
    const password = new URL(database.connection).password;
    if (password) expect(server.output()).not.toContain(password);
  });
});
