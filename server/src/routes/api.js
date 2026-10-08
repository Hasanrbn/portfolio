import { Router } from 'express';
import { createContactRouter } from './contact.js';
import { createAuthRouter } from './auth.js';
import { createAdminRouter } from './admin.js';

/**
 * Everything under /api. Each resource gets its router here.
 *
 * The session middleware only runs for the routes that need a session (`/csrf-token`,
 * `/auth`, `/admin`): the public pages and the contact form never touch the session table.
 * All `/api/admin` routes are mounted behind one `requireAdmin` + CSRF check (see admin.js).
 */
export function createApiRouter({
  contactController,
  contactRateLimit,
  authController,
  sessionMiddleware,
  requireAdmin,
  loginRateLimit,
  csrfRateLimit,
  adminRoutes = [],
}) {
  const router = Router();

  router.use(
    '/contact',
    createContactRouter({ controller: contactController, rateLimiter: contactRateLimit }),
  );

  router.get('/csrf-token', csrfRateLimit, sessionMiddleware, authController.csrfToken);
  router.use(
    '/auth',
    sessionMiddleware,
    createAuthRouter({ controller: authController, requireAdmin, loginRateLimit }),
  );
  router.use('/admin', sessionMiddleware, createAdminRouter({ requireAdmin, routes: adminRoutes }));

  return router;
}
