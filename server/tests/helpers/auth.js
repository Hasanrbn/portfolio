import request from 'supertest';
import { createApp } from '../../src/app.js';
import { parseEnv } from '../../src/config/env.js';
import { createMemoryUserStore } from '../../src/repositories/users.js';
import { createAdminAccount } from '../../src/services/adminAccountService.js';
import { createPasswordService } from '../../src/services/passwordService.js';
import { createFakeLogger } from './logger.js';

export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'correct horse battery staple';
export const SESSION_SECRET = 'a-test-secret-that-is-at-least-32-characters';

/** Same algorithm as production, but cheap enough that tests stay fast. */
export const cheapPasswordService = (overrides = {}) =>
  createPasswordService({ memoryCost: 64, timeCost: 1, ...overrides });

export const testEnv = (overrides = {}) =>
  parseEnv({ NODE_ENV: 'test', SESSION_SECRET, ...overrides });

/**
 * An app with an in-memory user store holding one admin. Everything can be replaced through
 * `options`; `envOverrides` changes the environment.
 */
export async function buildAuthApp({ envOverrides, ...options } = {}) {
  const passwordService = options.passwordService ?? cheapPasswordService();
  const userStore = options.userStore ?? createMemoryUserStore();
  const user = await createAdminAccount({
    userStore,
    passwordService,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const app = createApp({
    env: testEnv(envOverrides),
    logger: createFakeLogger(),
    ...options,
    userStore,
    passwordService,
  });
  return { app, userStore, passwordService, user };
}

/** The session cookie ("name=value") from a response, or undefined. */
export function sessionCookie(response, name = 'portfolio.sid') {
  const header = [response.headers['set-cookie'] ?? []]
    .flat()
    .find((c) => c.startsWith(`${name}=`));
  return header?.split(';')[0];
}

export const tokenFrom = (response) => response.body.data.csrfToken;

/** Fetches a token, signs in with it, and returns the agent (with its cookie) and the new token. */
export async function signIn(app, { email = ADMIN_EMAIL, password = ADMIN_PASSWORD } = {}) {
  const agent = request.agent(app);
  const before = await agent.get('/api/csrf-token');
  const response = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', tokenFrom(before))
    .send({ email, password });
  return { agent, response, csrfToken: response.body.data?.csrfToken };
}
