import express from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { createContactRouter } from './routes/contact.js';
import { createMemoryContactStore } from './repositories/contactMessages.js';
import { notFoundHandler } from './middleware/notFound.js';
import { createErrorHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express app without starting a listener, so tests can exercise
 * it directly. Configuration, logger and storage are injected rather than
 * imported.
 */
export function createApp({
  env,
  logger = console,
  contactStore = createMemoryContactStore(),
  contactNotifier = null,
  contactRateLimit,
}) {
  const app = express();

  app.locals.env = env;

  // Only trust X-Forwarded-For when told how many proxies are in front;
  // otherwise anyone could pick their own IP and dodge the rate limit.
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
  }

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.use(healthRouter);
  app.use(
    createContactRouter({
      store: contactStore,
      notifier: contactNotifier,
      rateLimiter: contactRateLimit,
      ipHashSalt: env.IP_HASH_SALT,
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
