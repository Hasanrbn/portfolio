import session from 'express-session';

/**
 * A signed-in session is cut off after this long no matter how active it is, so a stolen
 * cookie cannot be kept alive forever. (The idle limit is SESSION_IDLE_HOURS.)
 */
export const SESSION_ABSOLUTE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How the session cookie is set. In production the name starts with `__Host-`, which makes the
 * browser refuse the cookie unless it is Secure, has Path=/ and no Domain, so another
 * subdomain cannot set or overwrite it.
 *
 * Shared with the logout handler, which must clear the cookie with the very same attributes.
 */
export function sessionCookieSettings(env) {
  const production = env.NODE_ENV === 'production';
  return {
    name: production ? '__Host-portfolio.sid' : 'portfolio.sid',
    options: {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: '/',
    },
  };
}

/**
 * The session middleware. Sessions are only created when something is stored in them (the
 * CSRF token or a login), so ordinary visitors never get a cookie or a database row.
 * `rolling` renews the idle timeout on each request.
 */
export function createSessionMiddleware({ env, store, secret }) {
  const { name, options } = sessionCookieSettings(env);
  return session({
    name,
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    unset: 'destroy',
    cookie: { ...options, maxAge: env.SESSION_IDLE_HOURS * 60 * 60 * 1000 },
  });
}
