import express from 'express';
import { keycloak } from "../keycloak.js"; // Correct import path
import { 
    checkHealth,
} from '../controllers/rmController.js';


const router = express.Router();

//router.post('/events', addEvents);

router.get('/healthcheck', keycloak.protect(), checkHealth);

export default router;