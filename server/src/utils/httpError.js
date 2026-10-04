/**
 * Error whose message is safe to show to API clients.
 * Anything that is not an HttpError (or a body-parser error) is reported as a
 * generic 500 so internal details never leak.
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.expose = true;
  }
}

/**
 * 422 with one message per invalid field, e.g. `{ email: 'Enter a valid email address.' }`.
 * The messages come from our own validators, so they are safe to return.
 */
export class ValidationError extends HttpError {
  constructor(fieldErrors, message = 'Please check the highlighted fields.') {
    super(422, message);
    this.name = 'ValidationError';
    this.errors = Object.entries(fieldErrors).map(([field, fieldMessage]) => ({
      field,
      message: fieldMessage,
    }));
  }
}
