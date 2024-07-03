import config from './config.js';
import express from 'express';
import pg from 'pg';
import { v7 as uuidv7 } from 'uuid';
import path from 'path';
import logger from './logger.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);
const app = express();
const router = express.Router();

// Middleware
router.use(express.json());

// Serve static files from the "public" directory
router.use(express.static(path.join(dirname, 'public')));

// PostgreSQL connection pool
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

/**
 * Convert keywords, given as a string or an array, to an array of strings.
 */
function convertTagArray(keywords) {
  let keywordArray = [];
  if (keywords) {
    if (typeof keywords === 'string') keywordArray = keywords.split(',');
    else if (Array.isArray(keywords)) keywordArray = keywords.map(keyword => String(keyword));
  }
  return keywordArray.map(keyword => keyword.trim()).filter(Boolean);
}

// Endpoint to add events
router.post('/events', async (req, res) => {
    const { events } = req.body; // Expecting an array of events

    if (!events || !Array.isArray(events)) {
        logger.error('Invalid input format');
        return res.status(400).json({ error: 'Invalid input format' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const eventPromises = events.map(event => {
            const { header, link, source, admiralty_reliability, admiralty_accuracy, keywords, event_time, notes, hcoe_domains, location, location_lng, location_lat } = event;
            const id = uuidv7();
            const keywordArray = convertTagArray(keywords);

            return client.query(
                'INSERT INTO events (id, header, link, source, admiralty_reliability, admiralty_accuracy, keywords, event_time, notes, hcoe_domains, location, location_lng, location_lat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
                [id, header, link, source, admiralty_reliability, admiralty_accuracy, keywordArray, event_time, notes, hcoe_domains, location, location_lng, location_lat]
            );
        });

        await Promise.all(eventPromises);

        await client.query('COMMIT');
        logger.info('Events added successfully');
        res.status(201).json({ message: 'Events added successfully' });
        

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('ROLLBACK: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Endpoint to fetch events
router.get('/events', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM events ORDER BY creation_time DESC');
        res.json(result.rows);
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Endpoint to fetch unique keywords
router.get('/keywords', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT UNNEST(keywords) AS keyword, COUNT(*) AS count
            FROM events
            GROUP BY keyword
            ORDER BY count DESC
        `);

        // Create an object with keywords as keys and counts as values
        const keywordsWithCount = {};
        result.rows.forEach(row => {
            keywordsWithCount[row.keyword] = parseInt(row.count, 10);
        });

        res.json(keywordsWithCount);
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.use(config.baseUrl, router);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
});
