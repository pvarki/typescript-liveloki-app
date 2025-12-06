import express from 'express';
import eventRoutes from './eventRoutes.js';
import rmRoutes from './rmRoutes.js';
import harvesterRoutes from './harvesterRoutes.js';

const router = express.Router();

router.use('/api', eventRoutes);
router.use('/rmapi', rmRoutes);
router.use('/api/harvester', harvesterRoutes);

router.use('/api/v1', eventRoutes);

export default router;
