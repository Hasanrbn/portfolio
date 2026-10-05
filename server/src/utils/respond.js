/**
 * Every API answer uses the same envelope, so the client handles all endpoints alike:
 *
 *   success: { success: true, data }
 *   failure: { success: false, message, errors? }   (built by the error handler)
 */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function sendError(res, status, message, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}
