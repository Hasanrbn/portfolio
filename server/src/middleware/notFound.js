import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res, next) {
  next(new HttpError(404, 'Not found'));
}
