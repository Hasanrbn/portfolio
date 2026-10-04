import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateContact } from '@portfolio/shared/contact.js';
import { ValidationError } from '../utils/httpError.js';
import { hashIp } from '../utils/hashIp.js';

export const CONTACT_SUCCESS_MESSAGE = 'Your message has been sent.';
export const CONTACT_RATE_LIMIT_MESSAGE = 'Too many messages. Please try again later.';

// Name of the hidden form field that only bots fill in.
export const HONEYPOT_FIELD = 'website';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

export function createContactRateLimit({
  windowMs = RATE_LIMIT_WINDOW_MS,
  limit = RATE_LIMIT_MAX,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ success: false, message: CONTACT_RATE_LIMIT_MESSAGE }),
  });
}

/**
 * POST /api/contact
 *
 * Order matters: the rate limit runs first so rejected and bot requests count
 * too; the honeypot answers like a success (a bot learns nothing) without
 * storing anything; validation is repeated here because the browser check is
 * only a convenience. The email notification starts after the message is saved
 * and is not waited for, so a slow or broken mail server never delays or fails
 * the visitor's request.
 */
export function createContactRouter({
  store,
  notifier = null,
  rateLimiter = createContactRateLimit(),
  ipHashSalt = undefined,
}) {
  const router = Router();

  router.post('/api/contact', rateLimiter, async (req, res, next) => {
    try {
      const body = req.body !== null && typeof req.body === 'object' ? req.body : {};
      const succeeded = () =>
        res.status(201).json({ success: true, data: { message: CONTACT_SUCCESS_MESSAGE } });

      const honeypot = body[HONEYPOT_FIELD];
      if (typeof honeypot === 'string' ? honeypot.trim() !== '' : honeypot != null) {
        return succeeded();
      }

      const result = validateContact(body);
      if (!result.ok) {
        throw new ValidationError(result.errors);
      }

      await store.create({ ...result.values, ipHash: hashIp(req.ip, ipHashSalt) });
      notifier?.notify(result.values);
      return succeeded();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
