import { Router } from 'express';
import { createContactRouter } from './contact.js';

/**
 * Everything under /api. Each resource gets its router here. Today that is only the contact
 * form: the site's content is read from files by the pages, and nobody signs in.
 */
export function createApiRouter({ contactController, contactRateLimit }) {
  const router = Router();

  router.use(
    '/contact',
    createContactRouter({ controller: contactController, rateLimiter: contactRateLimit }),
  );

  return router;
}
