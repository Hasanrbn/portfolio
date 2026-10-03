import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/healthz', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});
