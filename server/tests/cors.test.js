import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { createFakeLogger } from './helpers/logger.js';

const SITE = 'https://me.example.com';

function buildApp(siteUrl = `${SITE}/`) {
  const env = parseEnv({ NODE_ENV: 'test', SITE_URL: siteUrl });
  return createApp({ env, logger: createFakeLogger() });
}

const message = {
  name: 'Ada',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'A real message that is long enough.',
};

describe('CORS for the contact API', () => {
  it('answers the preflight of the site and names what is allowed', async () => {
    const response = await request(buildApp())
      .options('/api/contact')
      .set('Origin', SITE)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(SITE);
    expect(response.headers['access-control-allow-methods']).toBe('POST, OPTIONS');
    expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    expect(response.headers.vary).toMatch(/Origin/);
  });

  it('gives no permission to any other site', async () => {
    const app = buildApp();

    for (const origin of [
      'https://evil.example.com',
      'http://me.example.com',
      `${SITE}.evil.com`,
    ]) {
      const preflight = await request(app)
        .options('/api/contact')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST');
      const real = await request(app).post('/api/contact').set('Origin', origin).send(message);

      expect(preflight.status).toBe(204);
      expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
      expect(real.headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  it('lets the site read the real answer too', async () => {
    const response = await request(buildApp())
      .post('/api/contact')
      .set('Origin', SITE)
      .send(message);

    expect(response.status).toBe(201);
    expect(response.headers['access-control-allow-origin']).toBe(SITE);
  });

  it('adds nothing for requests without an Origin (same site, curl, health checks)', async () => {
    const response = await request(buildApp()).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('only covers /api: the health probes stay closed to other sites', async () => {
    const response = await request(buildApp()).get('/healthz').set('Origin', SITE);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
