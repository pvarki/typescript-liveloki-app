import config from './config.js';
import express from 'express';
import pg from 'pg';
import { v7 as uuidv7 } from 'uuid';
import path from 'path';
import logger from './logger.js';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { expressjwt } from 'express-jwt';

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

// JWT Middleware
const jwtMiddleware = expressjwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`
    }),
    audience: `${process.env.KEYCLOAK_CLIENT_ID}`,
    issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    algorithms: ['RS256']
});

logger.info("KEYCLOAK_URL: " + process.env.KEYCLOAK_URL);

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
router.post('/api/events', async (req, res) => {
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
router.get('/api/events', async (req, res) => {
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

router.get('/api/events/trending/day', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM events WHERE creation_time >= NOW() - INTERVAL '24 hours'`
        );

        const { trendingEvents, trendingTag, percentageOfTotalTags, numberOfTags } = getTrendingEvents(result.rows);
        res.json({ trending_tag: trendingTag, precentage_of_tags: percentageOfTotalTags, number_of_tags: numberOfTags, events: trendingEvents });
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Endpoint for trending events in the last week
router.get('/api/events/trending/week', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM events WHERE creation_time >= NOW() - INTERVAL '1 week'`
        );

        const { trendingEvents, trendingTag, percentageOfTotalTags, numberOfTags } = getTrendingEvents(result.rows);
        res.json({ trending_tag: trendingTag, precentage_of_tags: percentageOfTotalTags, number_of_tags: numberOfTags, events: trendingEvents  });
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Function to get trending events based on keywords
function getTrendingEvents(events) {
    const keywordCounts = {};
    const eventsByKeyword = {};

    events.forEach(event => {
        event.keywords.forEach(keyword => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            if (!eventsByKeyword[keyword]) {
                eventsByKeyword[keyword] = [];
            }
            eventsByKeyword[keyword].push(event);
        });
    });

    const trendingKeyword = Object.keys(keywordCounts).reduce((a, b) => 
        keywordCounts[a] > keywordCounts[b] ? a : b
    );

    const totalTags = Object.values(keywordCounts).reduce((sum, count) => sum + count, 0);
    const numberOfTags = keywordCounts[trendingKeyword];
    const percentageOfTotalTags = (numberOfTags / totalTags) * 100;

    return {
        trendingEvents: eventsByKeyword[trendingKeyword] || [],
        trendingTag: trendingKeyword,
        percentageOfTotalTags: percentageOfTotalTags.toFixed(2),  // rounded to 2 decimal places
        numberOfTags: numberOfTags
    };
}

router.get('/api/event/:id', async (req, res) => {
    const client = await pool.connect();
    const eventId = req.params.id;

    try {
        const result = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Event not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Endpoint to fetch unique keywords
router.get('/api/keywords', async (req, res) => {
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

// Endpoint to search events by location and radius
router.get('/api/locationsearch', async (req, res) => {
    const { longitude, latitude, radius } = req.query;

    // Validate input parameters
    if (!longitude || !latitude || !radius) {
        return res.status(400).json({ error: 'Longitude, latitude, and radius are required' });
    }

    const client = await pool.connect();
    try {
        const query = `
            SELECT *
            FROM events
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography,
                $3 * 1000
            )
            ORDER BY creation_time DESC
        `;
        const values = [longitude, latitude, radius];

        const result = await client.query(query, values);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


// Protected test endpoint
router.get('/api/test', jwtMiddleware, (req, res) => {
    try {
        logger.info("Ping from TEST");
        res.send('Hello world');
    } catch (error) {
        logger.error(error.message);
        logger.error(error.errors);
    }
});

app.use(config.baseUrl, router);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
});
