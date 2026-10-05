/**
 * Writes one line per finished request: method, path, status and duration, with the request id.
 *
 * Deliberately left out: the query string, headers, cookies, bodies and the visitor's IP
 * address. Contact messages and (later) login details pass through here and must not end up
 * in logs. Health checks are logged at debug level so they do not drown out real traffic.
 */
export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    const entry = {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs,
    };

    if (res.statusCode >= 500) {
      req.log.error(entry, 'request failed');
    } else if (res.statusCode >= 400) {
      req.log.warn(entry, 'request rejected');
    } else if (entry.path === '/healthz') {
      req.log.debug(entry, 'request completed');
    } else {
      req.log.info(entry, 'request completed');
    }
  });

  next();
}
