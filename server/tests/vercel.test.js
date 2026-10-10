import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../src/config/env.js';

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('vercel.json', () => {
  it('builds the client and serves its output', () => {
    expect(config.buildCommand).toBe('npm run build -w @portfolio/client');
    expect(config.outputDirectory).toBe('client/dist');
    expect(config.framework).toBeNull();
  });

  it('sends the API routes to the function first and every other address to the app', () => {
    const rewrites = config.rewrites.map((rule) => [rule.source, rule.destination]);

    expect(rewrites).toEqual([
      ['/api/:path*', '/api'],
      ['/healthz', '/api'],
      ['/readyz', '/api'],
      ['/(.*)', '/index.html'],
    ]);
  });

  it('holds no secret', () => {
    const text = JSON.stringify(config);

    expect(text).not.toMatch(/postgres(ql)?:\/\//);
    expect(text).not.toMatch(/password|secret/i);
  });
});

describe('SITE_URL on Vercel', () => {
  const production = { NODE_ENV: 'production', DATABASE_URL: 'postgres://u:p@h/db' };

  it('is taken from the production domain Vercel announces', () => {
    const env = parseEnv({ ...production, VERCEL_PROJECT_PRODUCTION_URL: 'my-site.vercel.app' });

    expect(env.SITE_URL).toBe('https://my-site.vercel.app');
  });

  it('is overridden by an explicit SITE_URL', () => {
    const env = parseEnv({
      ...production,
      SITE_URL: 'https://www.example.com/',
      VERCEL_PROJECT_PRODUCTION_URL: 'my-site.vercel.app',
    });

    expect(env.SITE_URL).toBe('https://www.example.com');
  });

  it('is still required in production when nothing tells the address', () => {
    expect(() => parseEnv(production)).toThrow(/SITE_URL is required in production/);
  });
});

describe('api/index.js', () => {
  it('exports the Express app, which answers the health check and the CORS preflight', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SITE_URL', 'https://me.example.com');
    vi.stubEnv('DATABASE_URL', '');

    const { default: app } = await import('../../api/index.js');

    expect(typeof app).toBe('function');
    const health = await request(app).get('/healthz');
    expect(health.status).toBe(200);

    const preflight = await request(app)
      .options('/api/contact')
      .set('Origin', 'https://me.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(preflight.status).toBe(204);
  });

  it('runs as production when the host sets no NODE_ENV', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', undefined);
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'me.example.com');
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/none');

    const { default: app } = await import('../../api/index.js');

    expect(process.env.NODE_ENV).toBe('production');
    const health = await request(app).get('/healthz');
    expect(health.status).toBe(200);
  });
});
