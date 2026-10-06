import express from 'express';
import helmet from 'helmet';
import { createHealthRouter } from './routes/health.js';
import { createApiRouter } from './routes/api.js';
import { createContactController } from './controllers/contactController.js';
import { createContactService } from './services/contactService.js';
import { createMemoryContactStore } from './repositories/contactMessages.js';
import { createRequestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFoundHandler } from './middleware/notFound.js';
import { createErrorHandler } from './middleware/errorHandler.js';
import { createLogger } from './utils/logger.js';

/**
 * Builds the Express app without starting a listener, so tests can exercise it directly.
 * Everything with side effects (configuration, logger, storage, email) is passed in rather
 * than imported, and the layers are wired together here and nowhere else:
 *
 *   routes -> controllers -> services -> repositories
 *
 * Routes map URLs and attach middleware; controllers translate between HTTP and the service;
 * services hold the rules; repositories are the only code that touches storage.
 */
export function createApp({
  env,
  logger = createLogger(env),
  contactStore = createMemoryContactStore(),
  contactNotifier = null,
  contactRateLimit,
  checkReady = null,
}) {
  const app = express();

  app.locals.env = env;

  // Only trust X-Forwarded-For when told how many proxies are in front;
  // otherwise anyone could pick their own IP and dodge the rate limit.
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
  }

  // Order matters: ids and request logging first, so even rejected requests are recorded.
  app.use(createRequestId(logger));
  app.use(requestLogger);
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  const contactService = createContactService({
    store: contactStore,
    notifier: contactNotifier,
    ipHashSalt: env.IP_HASH_SALT,
  });
  const contactController = createContactController({ contactService });

  app.use(createHealthRouter({ checkReady }));
  app.use('/api', createApiRouter({ contactController, contactRateLimit }));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
