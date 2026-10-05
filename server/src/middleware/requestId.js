import { randomUUID } from 'node:crypto';

// An id sent by a proxy or load balancer is kept so one request can be followed across
// systems, but only if it is short and plain; anything else is replaced.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Gives every request an id, returns it in the X-Request-Id header, and attaches a logger
 * that already carries it (`req.log`), so every line written for one request can be found
 * together. Must run before everything that logs.
 */
export function createRequestId(logger) {
  return function requestId(req, res, next) {
    const incoming = req.get('x-request-id');
    req.id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    req.log = logger.child({ requestId: req.id });
    res.setHeader('X-Request-Id', req.id);
    next();
  };
}
