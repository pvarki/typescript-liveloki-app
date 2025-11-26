import express from 'express';
import eventRoutes from './eventRoutes.js';
import rmRoutes from './rmRoutes.js';
import userRoutes from './userRoutes.js';
import descriptionRoutes from './descriptionRoutes.js';

const router = express.Router();

router.use('/api', eventRoutes);
router.use('/rmapi', rmRoutes);

router.use('/api/v1', eventRoutes);
router.use('/api/v1', rmRoutes);

router.use('/api/users', userRoutes);
router.use('/api/v1/users', userRoutes);

router.use('/api/description', descriptionRoutes);
router.use('/api/v1/description', descriptionRoutes);

export default router;
