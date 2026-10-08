import { toPublicUser } from '../repositories/users.js';
import { forbidden, unauthorized } from '../utils/httpError.js';
import { destroySession } from '../utils/session.js';
import { SESSION_ABSOLUTE_LIFETIME_MS } from './session.js';

/**
 * Lets a request through only when its session belongs to an existing admin account.
 *
 * The account is read from the database on every request, not trusted from the session, so
 * deleting an account (or changing its role) takes effect immediately, and an expired or
 * orphaned session is destroyed. On success `req.user` is `{ id, email, role }`.
 *
 * Fails closed: if the session store or database is down, the error handler answers 500.
 */
export function createRequireAdmin({ userStore, now = Date.now }) {
  return async function requireAdmin(req, res, next) {
    const data = req.session;
    if (!data?.userId) {
      return next(unauthorized());
    }

    const tooOld =
      !Number.isFinite(data.authenticatedAt) ||
      now() - data.authenticatedAt > SESSION_ABSOLUTE_LIFETIME_MS;
    const user = tooOld ? null : await userStore.findById(data.userId);
    if (!user) {
      await destroySession(req);
      return next(unauthorized());
    }
    if (user.role !== 'admin') {
      return next(forbidden());
    }

    req.user = toPublicUser(user);
    return next();
  };
}
