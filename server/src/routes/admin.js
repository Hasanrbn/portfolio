import { Router } from 'express';
import { requireCsrf } from '../middleware/csrf.js';

/**
 * Everything under /api/admin. The two checks are installed ONCE, here, before any admin
 * route is attached, so a route added later cannot forget them:
 *
 *   1. requireAdmin: no valid admin session -> 401
 *   2. requireCsrf:  a write without the right X-CSRF-Token -> 403
 *
 * Even a path that does not exist answers 401 to a visitor who is not signed in, so the
 * response does not reveal which admin URLs exist.
 *
 * `routes` is a list of `{ path, router }`; the admin dashboard (Phase 14) adds its resources there.
 */
export function createAdminRouter({ requireAdmin, routes = [] }) {
  const router = Router();

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAdmin);
  router.use(requireCsrf);

  for (const { path, router: child } of routes) {
    router.use(path, child);
  }
  return router;
}
