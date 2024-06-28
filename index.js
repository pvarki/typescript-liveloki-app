const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Endpoint to add events
app.post('/events', async (req, res) => {
    const { events } = req.body; // Expecting an array of events

    if (!events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Invalid input format' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const eventPromises = events.map(event => {
            const { header, link, source, keywords } = event;
            const id = uuidv4();
            const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : [];
            
            return client.query(
                'INSERT INTO events (id, header, link, source, keywords) VALUES ($1, $2, $3, $4, $5)',
                [id, header, link, source, keywordArray]
            );
        });

        await Promise.all(eventPromises);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Events added successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Endpoint to fetch events
app.get('/events', async (req, res) => {
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
