import express from 'express';

import {
  createDashboard,
  deleteAllDashboards,
  deleteDashboard,
  getDashboard,
  listDashboards,
  updateDashboard,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/dashboards', listDashboards);
router.post('/dashboards', createDashboard);
router.delete('/dashboards', deleteAllDashboards);
router.get('/dashboards/:id', getDashboard);
router.put('/dashboards/:id', updateDashboard);
router.delete('/dashboards/:id', deleteDashboard);

export default router;
