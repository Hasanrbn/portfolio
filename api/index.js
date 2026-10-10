// The contact API as a Vercel serverless function. Vercel sends every /api/*, /healthz and
// /readyz request here (see vercel.json). It is the same Express app that "npm start" runs
// locally; only the way it is started differs (see server/src/runtime.js).
//
// The database must be migrated beforehand with "npm run db:migrate" from your own computer:
// a function that is started and stopped on demand is the wrong place to change tables.
import { loadEnv } from '../server/src/config/env.js';
import { createRuntime } from '../server/src/runtime.js';
import { createLogger } from '../server/src/utils/logger.js';

// On Vercel the function is production code. NODE_ENV is deliberately not set as a project
// variable (it would also reach the build and make "npm ci" skip the build tools), so it is
// filled in here instead. A value that is already set (tests, a preview of your own) is kept.
process.env.NODE_ENV ||= 'production';

const env = loadEnv();
const logger = createLogger(env);

// Many copies of the function can run at once and each opens its own connections, so each
// keeps only a few.
const { app } = createRuntime({ env, logger, poolMax: 3 });

export default app;
