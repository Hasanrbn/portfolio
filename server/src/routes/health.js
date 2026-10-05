import { Router } from 'express';
import { sendSuccess } from '../utils/respond.js';

export const healthRouter = Router();

healthRouter.get('/healthz', (req, res) => {
  sendSuccess(res, { status: 'ok' });
});
