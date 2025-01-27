import express from 'express';
import eventRoutes from './eventRoutes.js';
import rmRoutes from './rmRoutes.js';

const router = express.Router();

router.use('/api', eventRoutes);
router.use('/rmapi', rmRoutes);

export default router;
