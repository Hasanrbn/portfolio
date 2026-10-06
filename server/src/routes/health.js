import { Router } from 'express';
import { sendError, sendSuccess } from '../utils/respond.js';

/**
 * Two probes, for hosting platforms and load balancers:
 *
 *   GET /healthz  "Is the process alive?" Always 200 while the server can answer. It never
 *                 touches the database, so a database outage does not make the platform
 *                 restart a healthy server.
 *   GET /readyz   "Can it serve traffic?" 200 when the database answers, 503 when it does
 *                 not (the platform then stops sending visitors to this copy). Without a
 *                 database configured there is nothing to wait for, so it answers 200.
 *
 * `checkReady` is injected: it returns true or false and never throws.
 */
export function createHealthRouter({ checkReady = null } = {}) {
  const router = Router();

  router.get('/healthz', (req, res) => {
    sendSuccess(res, { status: 'ok' });
  });

  router.get('/readyz', async (req, res) => {
    const database = checkReady ? ((await checkReady()) ? 'up' : 'down') : 'not_configured';

    if (database === 'down') {
      res.set('Cache-Control', 'no-store');
      return sendError(res, 503, 'Service unavailable', { status: 'unavailable' });
    }
    res.set('Cache-Control', 'no-store');
    return sendSuccess(res, { status: 'ready', database });
  });

  return router;
}
