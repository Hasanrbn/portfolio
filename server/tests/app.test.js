import express from 'express';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { createErrorHandler } from '../src/middleware/errorHandler.js';
import { HttpError } from '../src/utils/httpError.js';
import { createFakeLogger } from './helpers/logger.js';

function buildTestApp(logger = createFakeLogger()) {
  const env = parseEnv({ NODE_ENV: 'test' });
  return { app: createApp({ env, logger }), logger };
}

describe('GET /healthz', () => {
  it('returns the standard success envelope', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('sends security headers and hides the framework', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/healthz');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('error handling', () => {
  it('answers unknown routes with a JSON 404', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Not found' });
  });

  it('answers malformed JSON bodies with a 400, not a 500', async () => {
    const { app } = buildTestApp();

    const response = await request(app)
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Invalid JSON body' });
  });

  it('rejects bodies over the size limit', async () => {
    const { app } = buildTestApp();

    const response = await request(app)
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: 'x'.repeat(20_000) }));

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ success: false, message: 'Request body is too large' });
  });

  it('hides internal error details behind a generic 500 and logs them', async () => {
    const logger = createFakeLogger();
    const failingApp = express();
    failingApp.get('/boom', () => {
      throw new Error('database password is hunter2');
    });
    failingApp.use(createErrorHandler(logger));

    const response = await request(failingApp).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Something went wrong.' });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error.mock.calls[0][0].err.message).toBe('database password is hunter2');
  });

  it('exposes the message of an HttpError', async () => {
    const failingApp = express();
    failingApp.get('/conflict', () => {
      throw new HttpError(409, 'Slug already exists');
    });
    failingApp.use(createErrorHandler(createFakeLogger()));

    const response = await request(failingApp).get('/conflict');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ success: false, message: 'Slug already exists' });
  });
});

describe('parseEnv', () => {
  it('applies defaults for development', () => {
    const env = parseEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.SITE_URL).toBe('http://localhost:5173');
  });

  it('treats empty strings as unset', () => {
    const env = parseEnv({ PORT: '', DATABASE_URL: '' });

    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it('requires SITE_URL in production', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/SITE_URL/);
  });

  it('rejects an invalid port', () => {
    expect(() => parseEnv({ PORT: '99999' })).toThrow(/PORT/);
  });

  it('removes a trailing slash from SITE_URL', () => {
    const env = parseEnv({ SITE_URL: 'https://example.com/' });

    expect(env.SITE_URL).toBe('https://example.com');
  });
});
