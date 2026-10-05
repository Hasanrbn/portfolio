import { HttpError, ValidationError } from '../utils/httpError.js';
import { sendError } from '../utils/respond.js';

const GENERIC_MESSAGE = 'Something went wrong.';

// body-parser puts parser internals in err.message (and Express puts the offending text in
// some routing errors), so errors that did not come from our own code are never echoed.
// Known ones get a fixed message; other 4xx errors get the standard text for their status.
const KNOWN_MESSAGES = {
  'entity.parse.failed': 'Invalid JSON body',
  'entity.too.large': 'Request body is too large',
  'charset.unsupported': 'Unsupported character set',
  'encoding.unsupported': 'Unsupported content encoding',
  'request.aborted': 'Request was cancelled',
};

const STATUS_MESSAGES = {
  400: 'Bad request',
  401: 'Authentication required',
  403: 'Forbidden',
  404: 'Not found',
  405: 'Method not allowed',
  408: 'Request timed out',
  409: 'Conflict',
  413: 'Request body is too large',
  415: 'Unsupported media type',
  422: 'Please check the highlighted fields.',
  429: 'Too many requests',
};

function clientMessage(err, status) {
  if (err instanceof HttpError) {
    return err.message;
  }
  return KNOWN_MESSAGES[err.type] ?? STATUS_MESSAGES[status] ?? 'Bad request';
}

/**
 * Central error handler, the only place that turns an error into a response.
 *
 *  - Our own HttpError / ValidationError: status and message go to the client as written.
 *  - Other 4xx errors raised by Express or body-parser (bad JSON, body too large, ...):
 *    a fixed, safe message for that situation.
 *  - Everything else is a bug or an outage: logged in full (with the request id) and
 *    answered with the same generic 500, in every environment. No stack trace or internal
 *    detail ever reaches the client.
 *
 * Client mistakes (4xx) are not logged here; the request logger already records them.
 */
export function createErrorHandler(logger) {
  // Express identifies error handlers by their four-argument signature,
  // so all four parameters must stay even if one were unused.
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    const status = Number.isInteger(err?.status) ? err.status : 500;
    const isClientError = status >= 400 && status < 500;

    if (!isClientError) {
      (req.log ?? logger).error({ err }, 'Unhandled error');
      return sendError(res, 500, GENERIC_MESSAGE);
    }

    const extra = err instanceof ValidationError ? { errors: err.errors } : {};
    return sendError(res, status, clientMessage(err, status), extra);
  };
}
