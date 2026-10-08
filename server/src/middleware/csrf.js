import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { forbidden } from '../utils/httpError.js';

export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The token tied to this session; created on first use. Needs the session middleware. */
export function ensureCsrfToken(req) {
  req.session.csrfToken ??= randomBytes(32).toString('base64url');
  return req.session.csrfToken;
}

function sameToken(expected, given) {
  // Hashing first makes both sides the same length, which timingSafeEqual requires, and
  // keeps the comparison time independent of how much of the token was right.
  const digest = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(expected), digest(given));
}

/**
 * Refuses (403) every request that changes something unless it carries this session's token
 * in the X-CSRF-Token header. A page on another site can make the browser send our cookie, but
 * cannot read the token (it is only given out by GET /api/csrf-token to our own pages), so it
 * cannot forge a valid request. Reads (GET, HEAD, OPTIONS) pass; they must not change anything.
 */
export function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }
  const expected = req.session?.csrfToken;
  const given = req.get(CSRF_HEADER);
  if (typeof expected !== 'string' || typeof given !== 'string' || !sameToken(expected, given)) {
    return next(forbidden('Invalid or missing CSRF token'));
  }
  return next();
}
