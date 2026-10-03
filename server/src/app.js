import express from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { notFoundHandler } from './middleware/notFound.js';
import { createErrorHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express app without starting a listener, so tests can exercise
 * it directly. Configuration and logger are injected rather than imported.
 */
export function createApp({ env, logger = console }) {
  const app = express();

  // `env` is not used by Phase 1 routes yet; it is part of the signature so
  // later phases (CORS, cookies, SEO injection) can read it without changes
  // to server.js.
  app.locals.env = env;

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.use(healthRouter);

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
