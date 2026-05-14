import express from 'express';

import {
    fetchTakChat,
    fetchTakMarkers,
    publishTakChatMessage,
    publishTakMarker,
} from '../controllers/takController.js';

const router = express.Router();

router.get('/tak/markers', fetchTakMarkers);
router.post('/tak/markers', publishTakMarker);
router.get('/tak/chat', fetchTakChat);
router.post('/tak/chat', publishTakChatMessage);

export default router;
