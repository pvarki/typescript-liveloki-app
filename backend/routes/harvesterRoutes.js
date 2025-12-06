import express from 'express';
import {
  getHarvesterConfig,
  updateHarvesterConfig,
  ingestHarvesterPreview,
  getHarvesterPreview,
  streamHarvesterPreview,
} from '../controllers/harvesterController.js';

const router = express.Router();

router.get('/config', getHarvesterConfig);
router.put('/config', updateHarvesterConfig);
router.post('/preview', ingestHarvesterPreview);
router.get('/preview', getHarvesterPreview);
router.get('/preview/stream', streamHarvesterPreview);

export default router;
