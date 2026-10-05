import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { createErrorHandler } from '../src/middleware/errorHandler.js';
import { createRequestId } from '../src/middleware/requestId.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';
import { validate } from '../src/middleware/validate.js';
import { createContactService, HONEYPOT_FIELD } from '../src/services/contactService.js';
import {
  ValidationError,
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from '../src/utils/httpError.js';
import { sendError, sendSuccess } from '../src/utils/respond.js';
import { createCapturingLogger, createFakeLogger } from './helpers/logger.js';

/** A small app with the real request-id, error-handler and the routes a test needs. */
function buildProbe(configure, logger = createFakeLogger()) {
  const app = express();
  app.use(createRequestId(logger));
  app.use(express.json());
  configure(app);
  app.use(createErrorHandler(logger));
  return { app, logger };
}

describe('response envelope', () => {
  it('wraps data in { success: true, data } with the given status', async () => {
    const { app } = buildProbe((a) => {
      a.get('/ok', (req, res) => sendSuccess(res, { id: 1 }));
      a.post('/made', (req, res) => sendSuccess(res, { id: 2 }, 201));
    });

    const ok = await request(app).get('/ok');
    const made = await request(app).post('/made');

    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ success: true, data: { id: 1 } });
    expect(made.status).toBe(201);
  });

  it('wraps failures in { success: false, message } and allows extra fields', async () => {
    const { app } = buildProbe((a) => {
      a.get('/no', (req, res) => sendError(res, 418, 'Teapot', { hint: 'tea' }));
    });

    const response = await request(app).get('/no');

    expect(response.status).toBe(418);
    expect(response.body).toEqual({ success: false, message: 'Teapot', hint: 'tea' });
  });
});

describe('error handler', () => {
  it.each([
    ['badRequest', badRequest('Missing page'), 400, 'Missing page'],
    ['unauthorized', unauthorized(), 401, 'Authentication required'],
    ['forbidden', forbidden(), 403, 'Forbidden'],
    ['notFound', notFound('No such project'), 404, 'No such project'],
    ['conflict', conflict('Slug already exists'), 409, 'Slug already exists'],
  ])(
    'answers an HttpError from %s with its own status and message',
    async (name, error, status, message) => {
      const { app, logger } = buildProbe((a) => {
        a.get('/e', () => {
          throw error;
        });
      });

      const response = await request(app).get('/e');

      expect(response.status).toBe(status);
      expect(response.body).toEqual({ success: false, message });
      expect(logger.error).not.toHaveBeenCalled();
    },
  );

  it('adds one entry per field for a validation error', async () => {
    const { app } = buildProbe((a) => {
      a.get('/v', () => {
        throw new ValidationError({ title: 'Enter a title.', slug: 'Use letters and dashes.' });
      });
    });

    const response = await request(app).get('/v');

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      message: 'Please check the highlighted fields.',
      errors: [
        { field: 'title', message: 'Enter a title.' },
        { field: 'slug', message: 'Use letters and dashes.' },
      ],
    });
  });

  it('does not repeat text from Express routing errors (a bad percent-escape in a path)', async () => {
    const { app } = buildProbe((a) => {
      a.get('/items/:id', (req, res) => sendSuccess(res, {}));
    });

    const response = await request(app).get('/items/%E0%A4%A');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Bad request' });
  });

  it('uses fixed text for a 4xx error that is not ours, whatever its own message says', async () => {
    const { app } = buildProbe((a) => {
      a.get('/odd', () => {
        throw Object.assign(new Error('secret detail /etc/passwd'), { status: 415, expose: true });
      });
    });

    const response = await request(app).get('/odd');

    expect(response.status).toBe(415);
    expect(response.body).toEqual({ success: false, message: 'Unsupported media type' });
  });

  it('answers a generic 500 for anything else, even when it carries a 5xx status', async () => {
    const { app, logger } = buildProbe((a) => {
      a.get('/down', () => {
        throw Object.assign(new Error('upstream at 10.0.0.5 refused'), { status: 503 });
      });
      a.get('/odd', () => {
        throw 'a string was thrown';
      });
    });

    const down = await request(app).get('/down');
    const odd = await request(app).get('/odd');

    for (const response of [down, odd]) {
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, message: 'Something went wrong.' });
    }
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('never puts a stack trace in the response, in any environment', async () => {
    for (const nodeEnv of ['development', 'production']) {
      const env = parseEnv({
        NODE_ENV: nodeEnv,
        SITE_URL: 'https://example.org',
        LOG_LEVEL: 'silent',
      });
      const app = createApp({
        env,
        contactStore: {
          create: vi.fn().mockRejectedValue(new Error('boom')),
        },
      });

      const response = await request(app).post('/api/contact').send({
        name: 'Ada',
        email: 'ada@example.com',
        subject: 'Hello',
        message: 'A message long enough.',
      });

      expect(response.status).toBe(500);
      expect(Object.keys(response.body).sort()).toEqual(['message', 'success']);
      expect(response.text).not.toMatch(/at .*\.js|stack|boom/i);
    }
  });

  it('hands the error on when the response has already started', () => {
    const logger = createFakeLogger();
    const handler = createErrorHandler(logger);
    const res = { headersSent: true, status: vi.fn(), json: vi.fn() };
    const next = vi.fn();
    const error = new Error('after the headers');

    handler(error, {}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('validate middleware', () => {
  const schema = z.object({
    title: z.string().trim().min(1, 'Enter a title.'),
    year: z.coerce.number().int().min(2000, 'Year must be 2000 or later.'),
  });

  function buildValidated() {
    return buildProbe((a) => {
      a.post(
        '/items',
        validate({
          body: schema,
          query: z.object({ draft: z.enum(['true', 'false']).default('false') }),
        }),
        (req, res) => sendSuccess(res, req.valid, 201),
      );
    });
  }

  it('hands on the cleaned values and drops unknown fields', async () => {
    const { app } = buildValidated();

    const response = await request(app)
      .post('/items?draft=true&other=1')
      .send({ title: '  Hello  ', year: '2024', isAdmin: true });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      body: { title: 'Hello', year: 2024 },
      query: { draft: 'true' },
    });
  });

  it('answers 422 with the first message for every wrong field', async () => {
    const { app } = buildValidated();

    const response = await request(app).post('/items?draft=maybe').send({ title: ' ', year: 1999 });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([
      { field: 'title', message: 'Enter a title.' },
      { field: 'year', message: 'Year must be 2000 or later.' },
      { field: 'draft', message: expect.any(String) },
    ]);
  });

  it('treats a missing body as an empty one', async () => {
    const { app } = buildValidated();

    const response = await request(app).post('/items');

    expect(response.status).toBe(422);
    expect(response.body.errors.map((entry) => entry.field)).toEqual(['title', 'year']);
  });
});

describe('rate limiter', () => {
  it('answers 429 with the given message after the limit and counts each limiter apart', async () => {
    const strict = createRateLimiter({ limit: 1, message: 'Slow down.' });
    const other = createRateLimiter({ limit: 1 });
    const { app } = buildProbe((a) => {
      a.get('/a', strict, (req, res) => sendSuccess(res, {}));
      a.get('/b', other, (req, res) => sendSuccess(res, {}));
    });

    const first = await request(app).get('/a');
    const second = await request(app).get('/a');
    const elsewhere = await request(app).get('/b');

    expect([first.status, second.status, elsewhere.status]).toEqual([200, 429, 200]);
    expect(second.body).toEqual({ success: false, message: 'Slow down.' });
  });
});

describe('request id', () => {
  it('creates an id, returns it in X-Request-Id and gives the request a logger that carries it', async () => {
    const logger = createFakeLogger();
    const { app } = buildProbe(
      (a) => a.get('/id', (req, res) => sendSuccess(res, { id: req.id })),
      logger,
    );

    const response = await request(app).get('/id');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.body.data.id).toBe(response.headers['x-request-id']);
    expect(logger.child).toHaveBeenCalledWith({ requestId: response.body.data.id });
  });

  it('keeps a plain id from a proxy and replaces anything unsafe', async () => {
    const { app } = buildProbe((a) => a.get('/id', (req, res) => sendSuccess(res, {})));

    const kept = await request(app).get('/id').set('X-Request-Id', 'proxy-abc_123.4');
    const tooShort = await request(app).get('/id').set('X-Request-Id', 'abc');
    const spaces = await request(app).get('/id').set('X-Request-Id', 'has spaces in it');
    const tooLong = await request(app).get('/id').set('X-Request-Id', 'a'.repeat(65));

    expect(kept.headers['x-request-id']).toBe('proxy-abc_123.4');
    for (const response of [tooShort, spaces, tooLong]) {
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('gives different requests different ids', async () => {
    const { app } = buildProbe((a) => a.get('/id', (req, res) => sendSuccess(res, {})));

    const [one, two] = await Promise.all([request(app).get('/id'), request(app).get('/id')]);

    expect(one.headers['x-request-id']).not.toBe(two.headers['x-request-id']);
  });
});

describe('request log', () => {
  function build() {
    const capture = createCapturingLogger({ level: 'debug' });
    const env = parseEnv({ NODE_ENV: 'test' });
    const app = createApp({ env, logger: capture.logger });
    return { app, ...capture };
  }

  it('writes one JSON line per request with the id, method, path, status and duration', async () => {
    const { app, lines } = build();

    const response = await request(app).get('/api/missing');

    const [line] = lines().filter((entry) => entry.msg === 'request rejected');
    expect(line).toMatchObject({
      level: 40,
      service: 'portfolio-api',
      requestId: response.headers['x-request-id'],
      method: 'GET',
      path: '/api/missing',
      status: 404,
    });
    expect(line.durationMs).toBeGreaterThanOrEqual(0);
    expect(new Date(line.time).toString()).not.toBe('Invalid Date');
  });

  it('leaves out the query string, headers, cookies, body and visitor address', async () => {
    const { app, raw } = build();

    await request(app)
      .post('/api/contact?token=query-secret')
      .set('Cookie', 'session=cookie-secret')
      .set('Authorization', 'Bearer header-secret')
      .set('X-Forwarded-For', '203.0.113.77')
      .send({
        name: 'Ada',
        email: 'private-address@example.com',
        subject: 'Private subject',
        message: 'A private message body.',
      });

    for (const secret of [
      'query-secret',
      'cookie-secret',
      'header-secret',
      '203.0.113.77',
      '127.0.0.1',
      'private-address',
      'Private subject',
      'private message',
    ]) {
      expect(raw()).not.toContain(secret);
    }
  });

  it('uses info for success, warn for client errors, error for server errors, debug for health checks', async () => {
    const capture = createCapturingLogger({ level: 'debug' });
    const env = parseEnv({ NODE_ENV: 'test' });
    const app = createApp({
      env,
      logger: capture.logger,
      contactStore: { create: vi.fn().mockRejectedValue(new Error('down')) },
    });

    await request(app).get('/healthz');
    await request(app).get('/nope');
    await request(app).post('/api/contact').send({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'Hello',
      message: 'Long enough message.',
    });

    const summaries = capture
      .lines()
      .filter((entry) => entry.method)
      .map((entry) => [entry.path, entry.level]);
    expect(summaries).toEqual([
      ['/healthz', 20],
      ['/nope', 40],
      ['/api/contact', 50],
    ]);
  });

  it('writes the stack of an unexpected error to the log, tagged with the request id', async () => {
    const capture = createCapturingLogger({ level: 'debug' });
    const app = createApp({
      env: parseEnv({ NODE_ENV: 'test' }),
      logger: capture.logger,
      contactStore: { create: vi.fn().mockRejectedValue(new Error('store is down')) },
    });

    const response = await request(app).post('/api/contact').send({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'Hello',
      message: 'Long enough message.',
    });

    const entry = capture.lines().find((line) => line.msg === 'Unhandled error');
    expect(entry.requestId).toBe(response.headers['x-request-id']);
    expect(entry.err.message).toBe('store is down');
    expect(entry.err.stack).toContain('store is down');
  });

  it('writes nothing when the level is silent', async () => {
    const capture = createCapturingLogger({ level: 'silent' });
    const app = createApp({ env: parseEnv({ NODE_ENV: 'test' }), logger: capture.logger });

    await request(app).get('/healthz');

    expect(capture.raw()).toBe('');
  });
});

describe('logger', () => {
  it('hides secrets that are logged by mistake', () => {
    const { logger, lines } = createCapturingLogger();

    logger.info(
      { password: 'pw1', user: { token: 'tok', name: 'ada' }, deep: { a: { secret: 's' } } },
      'oops',
    );
    logger.info(
      { req: { headers: { cookie: 'c=1', authorization: 'Bearer x', accept: 'json' } } },
      'req',
    );

    const [first, second] = lines();
    expect(first.password).toBe('[redacted]');
    expect(first.user).toEqual({ token: '[redacted]', name: 'ada' });
    expect(first.deep.a.secret).toBe('[redacted]');
    expect(second.req.headers).toEqual({
      cookie: '[redacted]',
      authorization: '[redacted]',
      accept: 'json',
    });
  });
});

describe('LOG_LEVEL in the environment', () => {
  it('defaults by environment and accepts an explicit level', () => {
    expect(parseEnv({ NODE_ENV: 'test' }).LOG_LEVEL).toBe('silent');
    expect(parseEnv({ NODE_ENV: 'development' }).LOG_LEVEL).toBe('debug');
    expect(parseEnv({ NODE_ENV: 'production', SITE_URL: 'https://example.org' }).LOG_LEVEL).toBe(
      'info',
    );
    expect(
      parseEnv({ NODE_ENV: 'production', SITE_URL: 'https://example.org', LOG_LEVEL: 'warn' })
        .LOG_LEVEL,
    ).toBe('warn');
    expect(parseEnv({ NODE_ENV: 'test', LOG_LEVEL: '' }).LOG_LEVEL).toBe('silent');
  });

  it('refuses an unknown level', () => {
    expect(() => parseEnv({ NODE_ENV: 'test', LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });
});

describe('contact service (no HTTP involved)', () => {
  const input = {
    name: 'Ada',
    email: 'ada@example.com',
    subject: 'Hello',
    message: 'A message long enough.',
  };

  function build(overrides = {}) {
    const store = { create: vi.fn().mockResolvedValue({ id: '1', createdAt: 'now' }) };
    const notifier = { notify: vi.fn() };
    const service = createContactService({
      store,
      notifier,
      ipHashSalt: 'a-long-random-salt-value',
      ...overrides,
    });
    return { service, store, notifier };
  }

  it('stores the cleaned values with a hashed address and then notifies', async () => {
    const { service, store, notifier } = build();

    const result = await service.submit({ ...input, name: '  Ada ' }, { ip: '203.0.113.9' });

    expect(result).toEqual({ stored: true });
    expect(store.create).toHaveBeenCalledWith({
      ...input,
      ipHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(JSON.stringify(store.create.mock.calls)).not.toContain('203.0.113.9');
    expect(notifier.notify).toHaveBeenCalledWith(input);
  });

  it('drops a bot silently: nothing stored, nothing sent, no error', async () => {
    const { service, store, notifier } = build();

    const result = await service.submit({ ...input, [HONEYPOT_FIELD]: 'http://spam' });

    expect(result).toEqual({ stored: false });
    expect(store.create).not.toHaveBeenCalled();
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it('throws a ValidationError and stores nothing for invalid input', async () => {
    const { service, store } = build();

    await expect(service.submit({ ...input, email: 'nope' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(service.submit(null)).rejects.toBeInstanceOf(ValidationError);
    expect(store.create).not.toHaveBeenCalled();
  });

  it('does not notify when saving fails, and works without a notifier', async () => {
    const failing = build({ store: { create: vi.fn().mockRejectedValue(new Error('disk')) } });
    await expect(failing.service.submit(input)).rejects.toThrow('disk');
    expect(failing.notifier.notify).not.toHaveBeenCalled();

    const quiet = build({ notifier: null });
    await expect(quiet.service.submit(input)).resolves.toEqual({ stored: true });
  });
});
