import { Router } from 'express';
import { createRateLimiter } from '../middleware/rateLimit.js';

export const CONTACT_RATE_LIMIT_MESSAGE = 'Too many messages. Please try again later.';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

/** Five messages per hour per visitor by default. */
export function createContactRateLimit({
  windowMs = RATE_LIMIT_WINDOW_MS,
  limit = RATE_LIMIT_MAX,
} = {}) {
  return createRateLimiter({ windowMs, limit, message: CONTACT_RATE_LIMIT_MESSAGE });
}

/**
 * POST /api/contact
 *
 * The rate limit runs first, so rejected and bot requests count too.
 */
export function createContactRouter({ controller, rateLimiter = createContactRateLimit() }) {
  const router = Router();
  router.post('/', rateLimiter, controller.submit);
  return router;
}
