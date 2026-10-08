import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';
import { productionWarnings } from '../src/config/warnings.js';

const production = {
  NODE_ENV: 'production',
  SITE_URL: 'https://example.org',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/portfolio',
};

describe('production warnings', () => {
  it('stays quiet outside production', () => {
    expect(productionWarnings(parseEnv({ NODE_ENV: 'development' }))).toEqual([]);
    expect(productionWarnings(parseEnv({ NODE_ENV: 'test' }))).toEqual([]);
  });

  it('warns that the contact limit would cover the whole site when no proxy is declared', () => {
    const warnings = productionWarnings(parseEnv(production));

    expect(warnings.some((text) => /TRUST_PROXY_HOPS/.test(text))).toBe(true);
  });

  it('warns that nothing announces new messages when email is off, since there is no admin page', () => {
    const warnings = productionWarnings(parseEnv(production));

    expect(warnings.some((text) => /SMTP_HOST/.test(text) && /npm run messages/.test(text))).toBe(
      true,
    );
  });

  it('has nothing to say when the proxy count and email are set', () => {
    const env = parseEnv({
      ...production,
      TRUST_PROXY_HOPS: '1',
      SMTP_HOST: 'smtp.example.org',
      CONTACT_NOTIFY_TO: 'me@example.org',
      CONTACT_MAIL_FROM: 'site@example.org',
    });

    expect(productionWarnings(env)).toEqual([]);
  });
});
