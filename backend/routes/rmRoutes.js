import express from 'express';
import {
    checkHealth, descriptionHandler, noOp,
} from '../controllers/rmController.js';


const router = express.Router();

router.get('/api/v1/healthcheck', checkHealth);

// POST /created - New device cert was created
router.post('/api/v1/users/created', noOp);

// POST /revoked - Device cert was revoked
router.post('/api/v1/users/revoked', noOp);

// POST /promoted - Device cert was promoted to admin privileges
router.post('/api/v1/users/promoted', noOp);

// POST /demoted - Device cert was demoted to standard privileges
router.post('/api/v1/users/demoted', noOp);

// PUT /updated - Device callsign updated
router.put('/api/v1/users/updated', noOp);

// GET /description - Card for modular UI. Admin only for now.
router.get('/api/v2/admin/description/:language', descriptionHandler);

export default router;
