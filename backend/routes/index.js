import express from 'express';

import config from '../config/index.js';
import { mtlsUserMiddleware } from '../middleware/mtlsUserMiddleware.js';
import dashboardRoutes from './dashboardRoutes.js';
import docsRoutes from './docsRoutes.js';
import eventRoutes from './eventRoutes.js';
import rmRoutes from './rmRoutes.js';

const router = express.Router();

if (config.useSwagger) {
  router.use(docsRoutes);
}

router.use('/api', mtlsUserMiddleware, dashboardRoutes);
router.use('/api', mtlsUserMiddleware, eventRoutes);
router.use('/rmapi', rmRoutes);

router.use('/api/v1', mtlsUserMiddleware, dashboardRoutes);
router.use('/api/v1', mtlsUserMiddleware, eventRoutes);

export default router;
