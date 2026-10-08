import { z } from 'zod';
import { ensureCsrfToken } from '../middleware/csrf.js';
import { toPublicUser } from '../repositories/users.js';
import { sendError, sendSuccess } from '../utils/respond.js';
import { destroySession, regenerateSession, saveSession } from '../utils/session.js';
import { PASSWORD_MAX_LENGTH } from '../services/passwordService.js';

export const INVALID_LOGIN_MESSAGE = 'Invalid email or password.';
export const BLOCKED_LOGIN_MESSAGE = 'Too many failed attempts. Please try again later.';

// Only the shape is checked here. Whether the account exists or the password is right is the
// service's job, and its answer is always the same generic message.
export const loginBodySchema = z.object({
  email: z
    .string({ error: 'Enter your email address.' })
    .trim()
    .toLowerCase()
    .min(1, 'Enter your email address.')
    .max(254, 'Enter a valid email address.'),
  password: z
    .string({ error: 'Enter your password.' })
    .min(1, 'Enter your password.')
    .max(PASSWORD_MAX_LENGTH, 'Enter your password.'),
});

const noStore = (res) => res.set('Cache-Control', 'no-store');

/**
 * Reads the request, calls the service, shapes the response. `cookie` is the session cookie's
 * name and attributes, needed to clear it exactly on logout.
 */
export function createAuthController({ authService, cookie }) {
  return {
    /** GET /api/csrf-token */
    csrfToken(req, res) {
      noStore(res);
      sendSuccess(res, { csrfToken: ensureCsrfToken(req) });
    },

    /** POST /api/auth/login */
    async login(req, res) {
      noStore(res);
      const result = await authService.authenticate(req.valid.body);

      if (result.status === 'blocked') {
        req.log.warn('sign-in blocked: too many failed attempts');
        res.set('Retry-After', String(result.retryAfterSeconds));
        return sendError(res, 429, BLOCKED_LOGIN_MESSAGE);
      }
      if (result.status === 'invalid') {
        return sendError(res, 401, INVALID_LOGIN_MESSAGE);
      }

      // A new session id from here on: an id the browser held before signing in (planted by
      // someone else, or leaked) no longer leads anywhere.
      await regenerateSession(req);
      req.session.userId = result.user.id;
      req.session.authenticatedAt = Date.now();
      const csrfToken = ensureCsrfToken(req);
      await saveSession(req);

      req.log.info({ userId: result.user.id }, 'admin signed in');
      return sendSuccess(res, { user: toPublicUser(result.user), csrfToken });
    },

    /** POST /api/auth/logout: always ends in "signed out", even if there was no session. */
    async logout(req, res) {
      noStore(res);
      await destroySession(req);
      res.clearCookie(cookie.name, cookie.options);
      res.status(204).end();
    },

    /** GET /api/auth/me (behind requireAdmin) */
    me(req, res) {
      noStore(res);
      sendSuccess(res, { user: req.user });
    },
  };
}
