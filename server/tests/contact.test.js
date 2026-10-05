import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import {
  createFileContactStore,
  createMemoryContactStore,
} from '../src/repositories/contactMessages.js';
import { CONTACT_RATE_LIMIT_MESSAGE, createContactRateLimit } from '../src/routes/contact.js';
import { CONTACT_SUCCESS_MESSAGE } from '../src/controllers/contactController.js';
import { HONEYPOT_FIELD } from '../src/services/contactService.js';
import { createFakeLogger } from './helpers/logger.js';
import { createContactNotifier, createNotifierFromEnv } from '../src/services/contactNotifier.js';
import { hashIp } from '../src/utils/hashIp.js';

const message = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'I would like to talk about a project.',
};

function buildApp({ envOverrides = {}, store = createMemoryContactStore(), limit } = {}) {
  const logger = createFakeLogger();
  const env = parseEnv({ NODE_ENV: 'test', ...envOverrides });
  const contactRateLimit = limit ? createContactRateLimit({ limit }) : undefined;
  const app = createApp({ env, logger, contactStore: store, contactRateLimit });
  return { app, store, logger };
}

describe('POST /api/contact', () => {
  it('stores a valid message and answers 201 with the success text', async () => {
    const { app, store } = buildApp();

    const response = await request(app).post('/api/contact').send(message);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: { message: CONTACT_SUCCESS_MESSAGE } });
    expect(CONTACT_SUCCESS_MESSAGE).toBe('Your message has been sent.');

    const saved = await store.list();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ ...message, status: 'new', ipHash: null });
  });

  it('stores trimmed, normalised values', async () => {
    const { app, store } = buildApp();

    await request(app)
      .post('/api/contact')
      .send({ ...message, name: '  Ada  ', email: ' ADA@Example.com ' });

    const [saved] = await store.list();
    expect(saved.name).toBe('Ada');
    expect(saved.email).toBe('ada@example.com');
  });

  it('ignores extra fields instead of storing them', async () => {
    const { app, store } = buildApp();

    await request(app)
      .post('/api/contact')
      .send({ ...message, status: 'archived', id: 'mine' });

    const [saved] = await store.list();
    expect(saved.status).toBe('new');
    expect(saved.id).not.toBe('mine');
  });

  describe('validation (the server does not trust the browser)', () => {
    it('answers 422 with one entry per invalid field and stores nothing', async () => {
      const { app, store } = buildApp();

      const response = await request(app)
        .post('/api/contact')
        .send({ name: '', email: 'not-an-email', subject: 'Hi', message: 'short' });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please check the highlighted fields.');
      expect(response.body.errors).toEqual([
        { field: 'name', message: 'Enter your name.' },
        { field: 'email', message: 'Enter a valid email address, like name@example.com.' },
        { field: 'message', message: 'Message must be at least 10 characters.' },
      ]);
      expect(await store.list()).toHaveLength(0);
    });

    it('rejects line breaks in the subject (email header injection)', async () => {
      const { app, store } = buildApp();

      const response = await request(app)
        .post('/api/contact')
        .send({ ...message, subject: 'Hi\r\nBcc: victim@example.com' });

      expect(response.status).toBe(422);
      expect(response.body.errors.map((error) => error.field)).toEqual(['subject']);
      expect(await store.list()).toHaveLength(0);
    });

    it('answers 422 when the body is missing, not JSON, or not an object', async () => {
      const { app } = buildApp();

      const noBody = await request(app).post('/api/contact');
      const plainText = await request(app)
        .post('/api/contact')
        .set('Content-Type', 'text/plain')
        .send('hello');
      const array = await request(app).post('/api/contact').send([message]);

      for (const response of [noBody, plainText, array]) {
        expect(response.status).toBe(422);
        expect(response.body.errors).toHaveLength(4);
      }
    });

    it('answers 400 for malformed JSON and 413 for an oversized body', async () => {
      const { app } = buildApp();

      const malformed = await request(app)
        .post('/api/contact')
        .set('Content-Type', 'application/json')
        .send('{"name":');
      const huge = await request(app)
        .post('/api/contact')
        .send({ ...message, message: 'x'.repeat(20_000) });

      expect(malformed.status).toBe(400);
      expect(malformed.body).toEqual({ success: false, message: 'Invalid JSON body' });
      expect(huge.status).toBe(413);
      expect(huge.body).toEqual({ success: false, message: 'Request body is too large' });
    });

    it('accepts the largest allowed message made only of 4-byte characters', async () => {
      const { app } = buildApp();

      const response = await request(app)
        .post('/api/contact')
        .send({
          name: '😀'.repeat(100),
          email: `${'a'.repeat(64)}@${'b'.repeat(180)}.com`,
          subject: '😀'.repeat(150),
          message: '😀'.repeat(2000),
        });

      expect(response.status).toBe(201);
    });
  });

  describe('honeypot', () => {
    it('answers like a success but stores nothing when the hidden field is filled', async () => {
      const { app, store } = buildApp();

      const response = await request(app)
        .post('/api/contact')
        .send({ ...message, [HONEYPOT_FIELD]: 'https://spam.example' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true, data: { message: CONTACT_SUCCESS_MESSAGE } });
      expect(await store.list()).toHaveLength(0);
    });

    it('catches non-string values too', async () => {
      const { app, store } = buildApp();

      await request(app)
        .post('/api/contact')
        .send({ ...message, [HONEYPOT_FIELD]: 1 });

      expect(await store.list()).toHaveLength(0);
    });

    it('lets a message through when the hidden field is empty or blank', async () => {
      const { app, store } = buildApp();

      await request(app)
        .post('/api/contact')
        .send({ ...message, [HONEYPOT_FIELD]: '' });
      await request(app)
        .post('/api/contact')
        .send({ ...message, [HONEYPOT_FIELD]: '   ' });

      expect(await store.list()).toHaveLength(2);
    });
  });

  describe('rate limit', () => {
    it('answers 429 once the limit is passed and keeps the message out of the store', async () => {
      const { app, store } = buildApp({ limit: 2 });

      const first = await request(app).post('/api/contact').send(message);
      const second = await request(app).post('/api/contact').send(message);
      const third = await request(app).post('/api/contact').send(message);

      expect([first.status, second.status, third.status]).toEqual([201, 201, 429]);
      expect(third.body).toEqual({ success: false, message: CONTACT_RATE_LIMIT_MESSAGE });
      expect(third.headers['ratelimit']).toBeDefined();
      expect(await store.list()).toHaveLength(2);
    });

    it('counts invalid and bot requests too', async () => {
      const { app } = buildApp({ limit: 2 });

      await request(app).post('/api/contact').send({});
      await request(app)
        .post('/api/contact')
        .send({ ...message, [HONEYPOT_FIELD]: 'x' });
      const third = await request(app).post('/api/contact').send(message);

      expect(third.status).toBe(429);
    });

    it('allows five messages per hour by default', async () => {
      const { app } = buildApp();

      const statuses = [];
      for (let i = 0; i < 6; i += 1) {
        statuses.push((await request(app).post('/api/contact').send(message)).status);
      }

      expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    });

    it('does not let a visitor choose their own address with X-Forwarded-For', async () => {
      const { app } = buildApp({ limit: 1 });

      await request(app).post('/api/contact').set('X-Forwarded-For', '1.1.1.1').send(message);
      const second = await request(app)
        .post('/api/contact')
        .set('X-Forwarded-For', '2.2.2.2')
        .send(message);

      expect(second.status).toBe(429);
    });
  });

  describe('failures', () => {
    it('answers a generic 500 and logs the cause when storing fails', async () => {
      const store = {
        create: vi.fn().mockRejectedValue(new Error('disk exploded at /secret/path')),
      };
      const { app, logger } = buildApp({ store });

      const response = await request(app).post('/api/contact').send(message);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, message: 'Something went wrong.' });
      expect(JSON.stringify(response.body)).not.toMatch(/secret/);
      // The cause is logged once with its stack; the request summary line carries no detail.
      const unhandled = logger.error.mock.calls.filter(([, text]) => text === 'Unhandled error');
      expect(unhandled).toHaveLength(1);
      expect(unhandled[0][0].err.message).toBe('disk exploded at /secret/path');
    });
  });

  describe('visitor IP', () => {
    it('stores no IP information when no salt is configured', async () => {
      const { app, store } = buildApp();

      await request(app).post('/api/contact').send(message);

      expect((await store.list())[0].ipHash).toBeNull();
    });

    it('stores a salted hash, never the address, when a salt is configured', async () => {
      const salt = 'a-long-random-salt-value';
      const { app, store } = buildApp({ envOverrides: { IP_HASH_SALT: salt } });

      await request(app).post('/api/contact').send(message);

      const [saved] = await store.list();
      expect(saved.ipHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(saved)).not.toMatch(/127\.0\.0\.1|::1/);
    });

    it('uses the forwarded address only when told how many proxies to trust', async () => {
      const { app, store } = buildApp({
        envOverrides: { IP_HASH_SALT: 'a-long-random-salt-value', TRUST_PROXY_HOPS: '1' },
      });

      await request(app).post('/api/contact').set('X-Forwarded-For', '203.0.113.9').send(message);

      const [saved] = await store.list();
      expect(saved.ipHash).toBe(hashIp('203.0.113.9', 'a-long-random-salt-value'));
    });
  });
});

describe('hashIp', () => {
  it('is stable for the same input and differs by address and by salt', () => {
    const salt = 'a-long-random-salt-value';

    expect(hashIp('203.0.113.9', salt)).toBe(hashIp('203.0.113.9', salt));
    expect(hashIp('203.0.113.9', salt)).not.toBe(hashIp('203.0.113.10', salt));
    expect(hashIp('203.0.113.9', salt)).not.toBe(hashIp('203.0.113.9', `${salt}x`));
  });

  it.each([
    [undefined, 'salt'],
    ['', 'salt'],
    ['203.0.113.9', undefined],
    ['203.0.113.9', ''],
  ])('returns null for ip=%j salt=%j', (ip, salt) => {
    expect(hashIp(ip, salt)).toBeNull();
  });
});

describe('contact settings in the environment', () => {
  it('has safe defaults', () => {
    const env = parseEnv({ NODE_ENV: 'test' });

    expect(env.TRUST_PROXY_HOPS).toBe(0);
    expect(env.IP_HASH_SALT).toBeUndefined();
    expect(env.CONTACT_STORE_PATH).toBeUndefined();
  });

  it('treats blank lines in .env as not set', () => {
    const env = parseEnv({ NODE_ENV: 'test', IP_HASH_SALT: '', CONTACT_STORE_PATH: '' });

    expect(env.IP_HASH_SALT).toBeUndefined();
  });

  it('refuses a short salt and a negative proxy count', () => {
    expect(() => parseEnv({ NODE_ENV: 'test', IP_HASH_SALT: 'short' })).toThrow(/IP_HASH_SALT/);
    expect(() => parseEnv({ NODE_ENV: 'test', TRUST_PROXY_HOPS: '-1' })).toThrow(
      /TRUST_PROXY_HOPS/,
    );
  });
});

describe('memory store', () => {
  it('returns newest first and hands out copies', async () => {
    const store = createMemoryContactStore();
    await store.create({ ...message, subject: 'first' });
    await store.create({ ...message, subject: 'second' });

    const list = await store.list();
    list[0].subject = 'changed';

    expect(list.map((record) => record.subject)).toEqual(['changed', 'first']);
    expect((await store.list())[0].subject).toBe('second');
  });

  it('drops the oldest message once it is full', async () => {
    const store = createMemoryContactStore({ capacity: 2 });
    for (const subject of ['one', 'two', 'three']) {
      await store.create({ ...message, subject });
    }

    expect((await store.list()).map((record) => record.subject)).toEqual(['three', 'two']);
  });
});

describe('file store', () => {
  let directory;
  let filePath;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'contact-store-'));
    filePath = path.join(directory, 'nested', 'messages.jsonl');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('creates the folder, saves one line per message and reads them back newest first', async () => {
    const store = createFileContactStore({ filePath });

    const created = await store.create({ ...message, subject: 'first' });
    await store.create({ ...message, subject: 'second', ipHash: 'abc' });

    const text = await readFile(filePath, 'utf8');
    expect(text.trim().split('\n')).toHaveLength(2);

    const list = await store.list();
    expect(list.map((record) => record.subject)).toEqual(['second', 'first']);
    expect(list[1]).toMatchObject({ id: created.id, status: 'new', ipHash: null });
    expect(list[0].ipHash).toBe('abc');
  });

  it('keeps a message made of several lines on a single stored line', async () => {
    const store = createFileContactStore({ filePath });

    await store.create({ ...message, message: 'Line one is here\nLine two is here' });

    expect((await readFile(filePath, 'utf8')).trim().split('\n')).toHaveLength(1);
    expect((await store.list())[0].message).toBe('Line one is here\nLine two is here');
  });

  it('is readable by the server user only (not checked on Windows)', async () => {
    const store = createFileContactStore({ filePath });
    await store.create(message);

    if (process.platform !== 'win32') {
      expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    }
  });

  it('returns an empty list when nothing was saved yet', async () => {
    expect(await createFileContactStore({ filePath }).list()).toEqual([]);
  });

  it('skips a damaged line and keeps the rest', async () => {
    const store = createFileContactStore({ filePath });
    await store.create({ ...message, subject: 'good' });
    await writeFile(filePath, `${await readFile(filePath, 'utf8')}{"cut off\n`);
    await store.create({ ...message, subject: 'also good' });

    expect((await store.list()).map((record) => record.subject)).toEqual(['also good', 'good']);
  });

  it('refuses new messages once the file is full', async () => {
    const store = createFileContactStore({ filePath, maxBytes: 100 });
    await store.create(message);

    await expect(store.create(message)).rejects.toThrow(/full/);
    expect(await store.list()).toHaveLength(1);
  });

  it('works end to end through the API', async () => {
    const { app } = buildApp({ store: createFileContactStore({ filePath }) });

    const response = await request(app).post('/api/contact').send(message);

    expect(response.status).toBe(201);
    expect(await createFileContactStore({ filePath }).list()).toHaveLength(1);
  });
});

describe('email notification', () => {
  const settings = { from: 'site@example.org', to: 'owner@example.org' };

  async function flush() {
    await new Promise((resolve) => setImmediate(resolve));
  }

  it('sends one plain-text email per saved message, with the visitor in Reply-To', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const notifier = createContactNotifier({ transport: { sendMail }, ...settings });
    const logger = createFakeLogger();
    const app = createApp({
      env: parseEnv({ NODE_ENV: 'test' }),
      logger,
      contactStore: createMemoryContactStore(),
      contactNotifier: notifier,
    });

    const response = await request(app).post('/api/contact').send(message);
    await flush();

    expect(response.status).toBe(201);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail).toMatchObject({
      from: settings.from,
      to: settings.to,
      replyTo: { name: message.name, address: message.email },
      subject: '[Portfolio] Hello',
    });
    expect(mail.text).toContain(message.message);
    expect(mail.html).toBeUndefined();
  });

  it('sends nothing for invalid messages and bot submissions', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const app = createApp({
      env: parseEnv({ NODE_ENV: 'test' }),
      logger: createFakeLogger(),
      contactNotifier: createContactNotifier({ transport: { sendMail }, ...settings }),
    });

    await request(app).post('/api/contact').send({});
    await request(app)
      .post('/api/contact')
      .send({ ...message, [HONEYPOT_FIELD]: 'x' });
    await flush();

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('still answers 201 when the mail server fails, and logs no personal data', async () => {
    const sendMail = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error(`rejected ${message.email}`), { code: 'EAUTH' }));
    const logger = createFakeLogger();
    const store = createMemoryContactStore();
    const app = createApp({
      env: parseEnv({ NODE_ENV: 'test' }),
      logger,
      contactStore: store,
      contactNotifier: createContactNotifier({ transport: { sendMail }, ...settings, logger }),
    });

    const response = await request(app).post('/api/contact').send(message);
    await flush();

    expect(response.status).toBe(201);
    expect(await store.list()).toHaveLength(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logger.error.mock.calls[0]);
    expect(logged).toContain('EAUTH');
    expect(logged).not.toContain(message.email);
  });

  it('does not wait for a slow mail server', async () => {
    const sendMail = vi.fn(() => new Promise(() => {}));
    const app = createApp({
      env: parseEnv({ NODE_ENV: 'test' }),
      logger: createFakeLogger(),
      contactNotifier: createContactNotifier({ transport: { sendMail }, ...settings }),
    });

    const response = await request(app).post('/api/contact').send(message);

    expect(response.status).toBe(201);
  });

  it('cannot be used to add headers: line breaks never reach the email fields', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const app = createApp({
      env: parseEnv({ NODE_ENV: 'test' }),
      logger: createFakeLogger(),
      contactNotifier: createContactNotifier({ transport: { sendMail }, ...settings }),
    });

    const response = await request(app)
      .post('/api/contact')
      .send({ ...message, name: 'Ada\r\nBcc: victim@example.com' });
    await flush();

    expect(response.status).toBe(422);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('is built from SMTP settings only when SMTP_HOST is set', () => {
    expect(createNotifierFromEnv(parseEnv({ NODE_ENV: 'test' }))).toBeNull();

    const env = parseEnv({
      NODE_ENV: 'test',
      SMTP_HOST: 'smtp.example.org',
      SMTP_USER: 'site@example.org',
      SMTP_PASSWORD: 'app-password',
      CONTACT_NOTIFY_TO: 'owner@example.org',
    });
    expect(createNotifierFromEnv(env)).toEqual({ notify: expect.any(Function) });
  });
});

describe('SMTP settings in the environment', () => {
  const base = {
    NODE_ENV: 'test',
    SMTP_HOST: 'smtp.example.org',
    SMTP_USER: 'site@example.org',
    SMTP_PASSWORD: 'app-password',
    CONTACT_NOTIFY_TO: 'owner@example.org',
  };

  it('defaults to port 587 with STARTTLS, and to TLS on port 465', () => {
    expect(parseEnv(base)).toMatchObject({ SMTP_PORT: 587, SMTP_SECURE: false });
    expect(parseEnv({ ...base, SMTP_PORT: '465' })).toMatchObject({ SMTP_SECURE: true });
    expect(parseEnv({ ...base, SMTP_PORT: '465', SMTP_SECURE: 'false' }).SMTP_SECURE).toBe(false);
  });

  it('is off, and asks for nothing else, when SMTP_HOST is empty', () => {
    const env = parseEnv({ NODE_ENV: 'test', SMTP_HOST: '' });

    expect(env.SMTP_HOST).toBeUndefined();
  });

  it('needs a recipient and a sender once SMTP_HOST is set', () => {
    expect(() => parseEnv({ ...base, CONTACT_NOTIFY_TO: '' })).toThrow(/CONTACT_NOTIFY_TO/);
    expect(() => parseEnv({ ...base, SMTP_USER: '', SMTP_PASSWORD: '' })).toThrow(
      /CONTACT_MAIL_FROM/,
    );
    expect(
      parseEnv({
        ...base,
        SMTP_USER: '',
        SMTP_PASSWORD: '',
        CONTACT_MAIL_FROM: 'site@example.org',
      }).SMTP_HOST,
    ).toBe('smtp.example.org');
  });

  it('refuses a user without a password and the other way round', () => {
    expect(() => parseEnv({ ...base, SMTP_PASSWORD: '' })).toThrow(/SMTP_PASSWORD/);
    expect(() => parseEnv({ ...base, SMTP_USER: '', CONTACT_MAIL_FROM: 'a@example.org' })).toThrow(
      /SMTP_PASSWORD/,
    );
  });

  it('refuses malformed addresses and an unknown SMTP_SECURE value', () => {
    expect(() => parseEnv({ ...base, CONTACT_NOTIFY_TO: 'not-an-email' })).toThrow(
      /CONTACT_NOTIFY_TO/,
    );
    expect(() => parseEnv({ ...base, SMTP_SECURE: 'yes' })).toThrow(/SMTP_SECURE/);
  });
});
