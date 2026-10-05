import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const DEFAULT_DEV_SITE_URL = 'http://localhost:5173';
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
const DEFAULT_LOG_LEVEL = { test: 'silent', development: 'debug', production: 'info' };

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    // How much the server writes to its log. When not set: silent in tests, debug while
    // developing, info in production.
    LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
    SITE_URL: z.string().url().optional(),
    // Not used until Phase 12; validated now so a malformed value fails early.
    DATABASE_URL: z.string().url().optional(),
    // How many reverse proxies sit in front of the app (0 = none, the safe
    // default). Needed so the rate limit sees the visitor's IP, not the proxy's.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    // Secret that salts the stored IP hash. Without it no IP information is stored.
    IP_HASH_SALT: z.string().min(16, 'must be at least 16 characters').optional(),
    // Where contact messages are saved until the database arrives (Phase 12).
    CONTACT_STORE_PATH: z.string().min(1).optional(),
    // Email notification for new contact messages (SMTP). Leave SMTP_HOST empty to turn it off.
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    // true = TLS from the first byte (usually port 465); false = upgrade with STARTTLS (587).
    // When not set it follows the port.
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    // Where notifications are sent, and the From address (defaults to SMTP_USER).
    CONTACT_NOTIFY_TO: z.string().email().optional(),
    CONTACT_MAIL_FROM: z.string().email().optional(),
  })
  .refine((env) => !env.SMTP_HOST || Boolean(env.CONTACT_NOTIFY_TO), {
    message: 'CONTACT_NOTIFY_TO is required when SMTP_HOST is set',
    path: ['CONTACT_NOTIFY_TO'],
  })
  .refine((env) => !env.SMTP_HOST || Boolean(env.CONTACT_MAIL_FROM ?? env.SMTP_USER), {
    message: 'CONTACT_MAIL_FROM (or SMTP_USER) is required when SMTP_HOST is set',
    path: ['CONTACT_MAIL_FROM'],
  })
  .refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASSWORD), {
    message: 'SMTP_USER and SMTP_PASSWORD must be set together',
    path: ['SMTP_PASSWORD'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.SITE_URL), {
    message: 'SITE_URL is required in production',
    path: ['SITE_URL'],
  })
  .transform((env) => ({
    ...env,
    SITE_URL: (env.SITE_URL ?? DEFAULT_DEV_SITE_URL).replace(/\/+$/, ''),
    SMTP_SECURE: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    LOG_LEVEL: env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL[env.NODE_ENV],
  }));

/**
 * Validates a raw environment object and returns typed, defaulted config.
 * Empty strings are treated as "not set" so a blank line in .env does not
 * turn into an invalid value.
 */
export function parseEnv(source) {
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(cleaned);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return Object.freeze(result.data);
}

/** Loads the repository-root .env (if present), then validates process.env. */
export function loadEnv() {
  const rootEnvPath = fileURLToPath(new URL('../../../.env', import.meta.url));
  dotenv.config({ path: rootEnvPath, quiet: true });
  return parseEnv(process.env);
}
