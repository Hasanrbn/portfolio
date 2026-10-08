import { randomBytes } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { createHealthRouter } from './routes/health.js';
import { createApiRouter } from './routes/api.js';
import { createAuthController } from './controllers/authController.js';
import { createContactController } from './controllers/contactController.js';
import { createContactService } from './services/contactService.js';
import { createAuthService } from './services/authService.js';
import { createPasswordService } from './services/passwordService.js';
import { createLoginThrottle } from './services/loginThrottle.js';
import { createMemoryContactStore } from './repositories/contactMessages.js';
import { createMemoryUserStore } from './repositories/users.js';
import { createRequireAdmin } from './middleware/requireAdmin.js';
import { createCsrfRateLimit, createLoginRateLimit } from './routes/auth.js';
import { createSessionMiddleware, sessionCookieSettings } from './middleware/session.js';
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
  // Authentication. The defaults keep everything in memory (tests, development without a
  // database); server.js passes the PostgreSQL stores.
  userStore = createMemoryUserStore(),
  sessionStore,
  passwordService = createPasswordService(),
  loginThrottle = createLoginThrottle(),
  loginRateLimit = createLoginRateLimit(),
  csrfRateLimit = createCsrfRateLimit(),
  // Routers for /api/admin, as `{ path, router }`. Everything in here sits behind the admin check.
  adminRoutes = [],
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

  const sessionMiddleware = createSessionMiddleware({
    env,
    store: sessionStore,
    secret: env.SESSION_SECRET ?? randomBytes(32).toString('hex'),
  });
  const authService = createAuthService({
    userStore,
    passwordService,
    throttle: loginThrottle,
    logger,
  });
  const authController = createAuthController({
    authService,
    cookie: sessionCookieSettings(env),
  });

  app.use(createHealthRouter({ checkReady }));
  app.use(
    '/api',
    createApiRouter({
      contactController,
      contactRateLimit,
      authController,
      sessionMiddleware,
      requireAdmin: createRequireAdmin({ userStore }),
      loginRateLimit,
      csrfRateLimit,
      adminRoutes,
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
