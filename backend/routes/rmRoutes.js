import express from 'express';
import {
    adminClientDataHandler,
    checkHealth,
    clientDataHandler,
    descriptionV1Handler,
    descriptionV2AdminHandler,
    descriptionV2Handler,
    instructionsHandler,
    noOp,
} from '../controllers/rmController.js';
import { requireRmCaller } from '../middleware/rmCallerMiddleware.js';


const router = express.Router();

router.get('/api/v1/healthcheck', checkHealth);
router.get('/api/v1/description/:language', requireRmCaller, descriptionV1Handler);
router.get('/api/v2/description/:language', requireRmCaller, descriptionV2Handler);
router.get('/api/v2/admin/description/:language', requireRmCaller, descriptionV2AdminHandler);

// POST /instructions/:language - Product instructions payload
router.post('/api/v1/instructions/:language', requireRmCaller, instructionsHandler);

// POST /clients/data - Product-specific client data for modular UI
router.post('/api/v2/clients/data', requireRmCaller, clientDataHandler);
router.post('/api/v2/admin/clients/data', requireRmCaller, adminClientDataHandler);

// POST /created - New device cert was created
router.post('/api/v1/users/created', requireRmCaller, noOp);

// POST /revoked - Device cert was revoked
router.post('/api/v1/users/revoked', requireRmCaller, noOp);

// POST /promoted - Device cert was promoted to admin privileges
router.post('/api/v1/users/promoted', requireRmCaller, noOp);

// POST /demoted - Device cert was demoted to standard privileges
router.post('/api/v1/users/demoted', requireRmCaller, noOp);

// PUT /updated - Device callsign updated
router.put('/api/v1/users/updated', requireRmCaller, noOp);
export default router;
