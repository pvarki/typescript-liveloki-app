import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  createDashboard,
  deleteAllDashboards,
  deleteDashboard,
  getDashboard,
  listDashboards,
  updateDashboard,
} from '../controllers/dashboardController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

const dashboardsReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

router.get('/dashboards', dashboardsReadLimiter, listDashboards);
router.post('/dashboards', requireAdmin, createDashboard);
router.delete('/dashboards', requireAdmin, deleteAllDashboards);
router.get('/dashboards/:id', getDashboard);
router.put('/dashboards/:id', requireAdmin, updateDashboard);
router.delete('/dashboards/:id', requireAdmin, deleteDashboard);

export default router;
