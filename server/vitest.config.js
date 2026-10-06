import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// The database tests need TEST_DATABASE_URL. It is read from the shell or from the root .env,
// and nothing else from .env reaches the tests (they build their own configuration).
const { parsed = {} } = dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  processEnv: {},
  quiet: true,
});
const testDatabaseUrl = process.env.TEST_DATABASE_URL || parsed.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    env: testDatabaseUrl ? { TEST_DATABASE_URL: testDatabaseUrl } : {},
  },
});
