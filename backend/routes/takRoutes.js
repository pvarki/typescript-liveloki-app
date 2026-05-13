import express from 'express';

import { fetchTakMarkers, publishTakMarker } from '../controllers/takController.js';

const router = express.Router();

router.get('/tak/markers', fetchTakMarkers);
router.post('/tak/markers', publishTakMarker);

export default router;
