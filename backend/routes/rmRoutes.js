import express from 'express';
import {
    adminClientDataHandler,
    checkHealth,
    clientDataHandler,
    descriptionV1Handler,
    descriptionV2AdminHandler,
    descriptionV2Handler,
    instructionsHandler,
    userCreated,
    userDemoted,
    userPromoted,
    userRevoked,
    userUpdated,
} from '../controllers/rmController.js';
import { requireRmCaller } from '../middleware/rmCallerMiddleware.js';


const router = express.Router();

router.get('/api/v1/healthcheck', checkHealth);
router.get('/api/v1/description/:language', requireRmCaller, descriptionV1Handler);
router.get('/api/v2/description/:language', requireRmCaller, descriptionV2Handler);
router.get('/api/v2/admin/description/:language', requireRmCaller, descriptionV2AdminHandler);
router.post('/api/v1/instructions/:language', requireRmCaller, instructionsHandler);
router.post('/api/v2/clients/data', requireRmCaller, clientDataHandler);
router.post('/api/v2/admin/clients/data', requireRmCaller, adminClientDataHandler);

router.post('/api/v1/users/created', requireRmCaller, userCreated);
router.post('/api/v1/users/revoked', requireRmCaller, userRevoked);
router.post('/api/v1/users/promoted', requireRmCaller, userPromoted);
router.post('/api/v1/users/demoted', requireRmCaller, userDemoted);
router.put('/api/v1/users/updated', requireRmCaller, userUpdated);

export default router;
