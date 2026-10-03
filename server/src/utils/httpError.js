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
