import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/respond.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Limits how many requests one visitor can make in a time window, then answers 429.
 * Counts live in memory, so they reset when the server restarts and are not shared between
 * several server copies; that is enough for one small service (see docs/backend.md).
 * Each endpoint that needs a limit creates its own limiter, so their counts stay separate.
 */
export function createRateLimiter({
  windowMs = ONE_HOUR_MS,
  limit = 5,
  message = 'Too many requests. Please try again later.',
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => sendError(res, 429, message),
  });
}
