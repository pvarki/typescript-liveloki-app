import express from 'express';


const router = express.Router();

// POST /created - New device cert was created
router.post('/created', async (req, res) => {
    res.json({ success: true });
});

// POST /revoked - Device cert was revoked
router.post('/revoked', async (req, res) => {
    res.json({ success: true });
});

// POST /promoted - Device cert was promoted to admin privileges
router.post('/promoted', async (req, res) => {
    res.json({ success: true });
});

// POST /demoted - Device cert was demoted to standard privileges
router.post('/demoted', async (req, res) => {
    res.json({ success: true });
});

// PUT /updated - Device callsign updated
router.put('/updated', async (req, res) => {
    res.json({ success: true });
});

export default router;
