import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const blueprint = readFileSync(new URL('../../render.yaml', import.meta.url), 'utf8');

// Render reads render.yaml from the repository, so it must never hold a secret. Prettier checks
// that the file is valid YAML; these checks guard what matters for the site.
describe('render.yaml', () => {
  it('holds no secret: the database address and the public addresses are typed in the dashboard', () => {
    expect(blueprint).not.toMatch(/postgres(ql)?:\/\//);
    expect(blueprint).not.toMatch(/password|secret_key|api_key/i);
    for (const key of ['DATABASE_URL', 'SITE_URL', 'VITE_API_URL']) {
      expect(blueprint).toMatch(new RegExp(`- key: ${key}\\n\\s+sync: false`));
    }
  });

  it('runs the API in production behind one proxy, with a generated IP salt', () => {
    expect(blueprint).toMatch(/- key: NODE_ENV\n\s+value: production/);
    expect(blueprint).toMatch(/- key: TRUST_PROXY_HOPS\n\s+value: 1/);
    expect(blueprint).toMatch(/- key: IP_HASH_SALT\n\s+generateValue: true/);
  });

  it('brings the database up to date before the server starts', () => {
    expect(blueprint).toMatch(/startCommand: npm run db:migrate && npm start/);
    expect(blueprint).toMatch(/healthCheckPath: \/healthz/);
  });

  it('serves the built client and opens the app for addresses that are not files', () => {
    expect(blueprint).toMatch(/staticPublishPath: client\/dist/);
    expect(blueprint).toMatch(/source: \/\*\n\s+destination: \/index\.html/);
  });
});
