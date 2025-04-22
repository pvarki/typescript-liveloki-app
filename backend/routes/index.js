import express from 'express';
import eventRoutes from './eventRoutes.js';
import rmRoutes from './rmRoutes.js';

const router = express.Router();

router.use('/api', eventRoutes);
router.use('/rmapi', rmRoutes);

router.use('/api/v1', eventRoutes);
router.use('/api/v1', rmRoutes);

export default router;
