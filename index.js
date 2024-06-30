const config = require('./config.js');
const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const app = express();
const router = express.Router();

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
        return res.status(400).json({ error: 'Invalid input format' });
    }

    console.log(req.body);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const eventPromises = events.map(event => {
            const { header, link, source, admiralty_reliability, admiralty_accuracy, keywords, event_time, creation_time} = event;
            const id = uuidv4();
            const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : [];

            return client.query(
                'INSERT INTO events (id, header, link, source, admiralty_reliability, admiralty_accuracy, keywords, event_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, header, link, source, admiralty_reliability, admiralty_accuracy, keywordArray, event_time]
            );
        });

        await Promise.all(eventPromises);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Events added successfully' });
        console.log(req.body);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Endpoint to fetch events
router.get('/events', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM events');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.use(config.baseUrl, router);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
