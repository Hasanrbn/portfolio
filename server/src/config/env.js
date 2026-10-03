import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const DEFAULT_DEV_SITE_URL = 'http://localhost:5173';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    SITE_URL: z.string().url().optional(),
    // Not used until Phase 12; validated now so a malformed value fails early.
    DATABASE_URL: z.string().url().optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.SITE_URL), {
    message: 'SITE_URL is required in production',
    path: ['SITE_URL'],
  })
  .transform((env) => ({
    ...env,
    SITE_URL: (env.SITE_URL ?? DEFAULT_DEV_SITE_URL).replace(/\/+$/, ''),
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
