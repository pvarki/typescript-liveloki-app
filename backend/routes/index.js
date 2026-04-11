import express from 'express';
import eventRoutes from './eventRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import rmRoutes from './rmRoutes.js';
import { mtlsUserMiddleware } from '../middleware/mtlsUserMiddleware.js';

const router = express.Router();

router.use('/api', mtlsUserMiddleware, dashboardRoutes);
router.use('/api', mtlsUserMiddleware, eventRoutes);
router.use('/rmapi', rmRoutes);

router.use('/api/v1', mtlsUserMiddleware, dashboardRoutes);
router.use('/api/v1', mtlsUserMiddleware, eventRoutes);

export default router;
