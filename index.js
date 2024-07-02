const config = require('./config.js');
const express = require('express');
const { Pool } = require('pg');
const { v7: uuidv7 } = require('uuid');
const path = require('path');
const app = express();
const router = express.Router();
const logger = require('./logger');

// Middleware
router.use(express.json());

// Serve static files from the "public" directory
router.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

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
            const { header, link, source, admiralty_reliability, admiralty_accuracy, keywords, event_time } = event;
            const id = uuidv7();
            const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : [];

            return client.query(
                'INSERT INTO events (id, header, link, source, admiralty_reliability, admiralty_accuracy, keywords, event_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, header, link, source, admiralty_reliability, admiralty_accuracy, keywordArray, event_time]
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
        const result = await client.query('SELECT DISTINCT UNNEST(keywords) AS keyword FROM events');
        const keywords = result.rows.map(row => row.keyword);
        res.json(keywords);
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
