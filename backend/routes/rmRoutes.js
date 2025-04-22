import express from 'express';
import {
    checkHealth,
} from '../controllers/rmController.js';


const router = express.Router();

router.get('/healthcheck', checkHealth);

export default router;