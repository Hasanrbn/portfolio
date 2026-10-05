import { notFound } from '../utils/httpError.js';

/** Last route: anything that matched nothing is a JSON 404 (pages are served by Phase 17). */
export function notFoundHandler(req, res, next) {
  next(notFound());
}
