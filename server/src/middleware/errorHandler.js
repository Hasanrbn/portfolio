const GENERIC_MESSAGE = 'Something went wrong.';

// body-parser puts parser internals in err.message, so map its known error
// types to fixed client-facing messages instead of echoing them.
const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': 'Invalid JSON body',
  'entity.too.large': 'Request body is too large',
};

/**
 * Central error handler. Errors that opted in to exposure (HttpError, and
 * body-parser errors such as malformed JSON) return their own 4xx message;
 * everything else is logged and answered with a generic 500.
 */
export function createErrorHandler(logger) {
  // Express identifies error handlers by their four-argument signature,
  // so all four parameters must stay even if one were unused.
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    const status = Number.isInteger(err.status) ? err.status : 500;
    const isClientError = status >= 400 && status < 500 && err.expose === true;

    if (!isClientError) {
      logger.error(err);
      return res.status(500).json({ success: false, message: GENERIC_MESSAGE });
    }

    return res
      .status(status)
      .json({ success: false, message: BODY_PARSER_MESSAGES[err.type] ?? err.message });
  };
}
