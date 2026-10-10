const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Accept';
const PREFLIGHT_MAX_AGE_SECONDS = '600';

/**
 * Lets the website call the API when the two live at different addresses (for example
 * https://me.onrender.com and https://me-api.onrender.com). Exactly one origin is allowed, the
 * site's own address (SITE_URL); every other site gets no CORS headers, so browsers keep
 * refusing to let it read the API's answers. Nothing is sent as a cookie, so credentials are
 * never allowed.
 *
 * Mounted before the rate limit, so a browser's automatic "may I?" request (the preflight)
 * does not use up a visitor's allowance.
 */
export function createCors({ siteUrl }) {
  const allowedOrigin = new URL(siteUrl).origin;

  return function cors(req, res, next) {
    res.vary('Origin');
    const origin = req.get('Origin');
    const allowed = origin === allowedOrigin;

    if (allowed) {
      res.set('Access-Control-Allow-Origin', origin);
    }

    const isPreflight =
      req.method === 'OPTIONS' && Boolean(req.get('Access-Control-Request-Method'));
    if (isPreflight) {
      if (allowed) {
        res.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
        res.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
        res.set('Access-Control-Max-Age', PREFLIGHT_MAX_AGE_SECONDS);
      }
      return res.status(204).end();
    }

    return next();
  };
}
