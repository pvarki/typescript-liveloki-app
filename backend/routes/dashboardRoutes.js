import express from 'express';

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

router.get('/dashboards', listDashboards);
router.post('/dashboards', requireAdmin, createDashboard);
router.delete('/dashboards', requireAdmin, deleteAllDashboards);
router.get('/dashboards/:id', getDashboard);
router.put('/dashboards/:id', requireAdmin, updateDashboard);
router.delete('/dashboards/:id', requireAdmin, deleteDashboard);

export default router;
