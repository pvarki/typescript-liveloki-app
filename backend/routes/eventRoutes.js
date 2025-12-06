import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
    addEvents, 
    fetchEvents, 
    fetchEventById, 
    fetchTrendingEventsDay, 
    fetchTrendingEventsWeek, 
    fetchKeywords, 
    searchEventsByLocation, 
    uploadImages,
    fetchMetrics,
    createGroup,
    updateEventGroup,
    fetchGroups,
    fetchEventsByGroup,
    removeFromGroup
} from '../controllers/eventController.js';
import multer from 'multer';
import path from 'path';
import { v7 as uuidv7 } from 'uuid';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const router = express.Router();
const dirname = path.dirname(fileURLToPath(import.meta.url));

const isHarvesterRequest = (req) => {
    if (!config.harvesterApiKey) {
        return false;
    }

    const headerKey = req.headers['x-harvester-key'];
    return typeof headerKey === 'string' && headerKey === config.harvesterApiKey;
};

// Rate limiting configurations
const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: isHarvesterRequest,
});

const strictRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // More restrictive for write operations
    message: {
        error: 'Too many write requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: isHarvesterRequest,
});

const uploadRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Very restrictive for file uploads
    message: {
        error: 'Too many upload requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: isHarvesterRequest,
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, uuidv7() + path.extname(file.originalname)); // Appending extension
    }
});
const upload = multer({ storage: storage });

// Apply rate limiting to routes
router.post('/events', strictRateLimit, addEvents);
router.get('/events', generalRateLimit, fetchEvents);
router.get('/events/trending/day', generalRateLimit, fetchTrendingEventsDay);
router.get('/events/trending/week', generalRateLimit, fetchTrendingEventsWeek);
router.get('/event/:id', generalRateLimit, fetchEventById);
router.get('/keywords', generalRateLimit, fetchKeywords);
router.get('/locationsearch', generalRateLimit, searchEventsByLocation);
router.post('/upload', uploadRateLimit, upload.any(), uploadImages);
router.get('/metrics', generalRateLimit, fetchMetrics);

// Group management routes
router.post('/groups', strictRateLimit, createGroup);
router.get('/groups', generalRateLimit, fetchGroups);
router.get('/groups/:groupName', generalRateLimit, fetchEventsByGroup);
router.put('/events/:eventId/group', strictRateLimit, updateEventGroup);
router.delete('/events/:eventId/group', strictRateLimit, removeFromGroup);

export default router;
