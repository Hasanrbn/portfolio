import { Router } from 'express';
import { createContactRouter } from './contact.js';

/**
 * Everything under /api. Each resource gets its router here; the `/api/admin` routes added in
 * Phase 13 will be mounted behind one `requireAdmin` check so none can be forgotten.
 */
export function createApiRouter({ contactController, contactRateLimit }) {
  const router = Router();

  router.use(
    '/contact',
    createContactRouter({ controller: contactController, rateLimiter: contactRateLimit }),
  );

  return router;
}
