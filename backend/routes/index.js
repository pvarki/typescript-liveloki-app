import express from 'express';
import eventRoutes from './eventRoutes.js';
import rmRoutes from './rmRoutes.js';
import { keycloak } from '../middlewares/keycloak.js';

const router = express.Router();

router.use(keycloak.middleware());
router.use('/api', eventRoutes);
router.use('/rmapi', rmRoutes);

export default router;
