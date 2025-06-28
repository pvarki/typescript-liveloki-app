import express from 'express';
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

const router = express.Router();
const dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, uuidv7() + path.extname(file.originalname)); // Appending extension
    }
});
const upload = multer({ storage: storage });

router.post('/events', addEvents);
router.get('/events', fetchEvents);
router.get('/events/trending/day', fetchTrendingEventsDay);
router.get('/events/trending/week', fetchTrendingEventsWeek);
router.get('/event/:id', fetchEventById);
router.get('/keywords', fetchKeywords);
router.get('/locationsearch', searchEventsByLocation);
router.post('/upload', upload.any(), uploadImages);
router.get('/metrics', fetchMetrics);

// Group management routes
router.post('/groups', createGroup);
router.get('/groups', fetchGroups);
router.get('/groups/:groupName', fetchEventsByGroup);
router.put('/events/:eventId/group', updateEventGroup);
router.delete('/events/:eventId/group', removeFromGroup);

export default router;