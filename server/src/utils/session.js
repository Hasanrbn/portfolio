/**
 * express-session works with callbacks; these wrap the three calls the auth code needs so
 * a failure (for example the session table being unreachable) becomes a rejected promise,
 * which Express 5 sends to the error handler.
 */
const promisified = (method) => (req) =>
  new Promise((resolve, reject) => {
    req.session[method]((error) => (error ? reject(error) : resolve()));
  });

/** New session id, empty session. Called at sign-in so an id known before it is useless after. */
export const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });

export const saveSession = promisified('save');
export const destroySession = promisified('destroy');
