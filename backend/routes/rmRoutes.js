import express from 'express';
import {
    checkHealth, descriptionHandler, noOp,
} from '../controllers/rmController.js';


const router = express.Router();

router.get('/healthcheck', checkHealth);

// POST /created - New device cert was created
router.post('/api/v1/users/created', noOp);

// POST /revoked - Device cert was revoked
router.post('/users/revoked', noOp);

// POST /promoted - Device cert was promoted to admin privileges
router.post('/users/promoted', noOp);

// POST /demoted - Device cert was demoted to standard privileges
router.post('/users/demoted', noOp);

// PUT /updated - Device callsign updated
router.put('/users/updated', noOp);

router.get('/description/:language', descriptionHandler);

export default router;