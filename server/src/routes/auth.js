import { Router } from 'express';
import { loginBodySchema } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { requireCsrf } from '../middleware/csrf.js';

export const LOGIN_RATE_LIMIT_MESSAGE = 'Too many sign-in attempts. Please try again later.';

/** Twenty sign-in attempts per 15 minutes per visitor (the per-email limit is separate). */
export function createLoginRateLimit({ windowMs = 15 * 60 * 1000, limit = 20 } = {}) {
  return createRateLimiter({ windowMs, limit, message: LOGIN_RATE_LIMIT_MESSAGE });
}

/** Enough to fetch a token on every page load of the admin area, not enough to flood sessions. */
export function createCsrfRateLimit({ windowMs = 15 * 60 * 1000, limit = 100 } = {}) {
  return createRateLimiter({
    windowMs,
    limit,
    message: 'Too many requests. Please try again later.',
  });
}

/**
 * /api/auth/*
 *
 * Login: the IP limit runs first (rejected attempts count), then the CSRF check, then the
 * shape of the body. Logout also needs the token, so another site cannot sign the admin out.
 */
export function createAuthRouter({
  controller,
  requireAdmin,
  loginRateLimit = createLoginRateLimit(),
}) {
  const router = Router();
  router.post(
    '/login',
    loginRateLimit,
    requireCsrf,
    validate({ body: loginBodySchema }),
    controller.login,
  );
  router.post('/logout', requireCsrf, controller.logout);
  router.get('/me', requireAdmin, controller.me);
  return router;
}
