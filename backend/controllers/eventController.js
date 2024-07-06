import pool from '../models/pool.js';
import { convertTagArray, getTrendingEvents } from '../utils/helpers.js';
import { v7 as uuidv7 } from 'uuid';
import path from 'path';
import logger from '../logger.js';

export const addEvents = async (req, res) => {
    const { events } = req.body;

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
};

export const fetchEvents = async (req, res) => {
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
};

export const fetchEventById = async (req, res) => {
    const client = await pool.connect();
    const eventId = req.params.id;

    try {
        const eventResult = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventResult.rows[0];

        const imagesResult = await client.query('SELECT url FROM event_media WHERE event_id = $1', [eventId]);
        const images = imagesResult.rows.map(row => row.url);

        res.json({ ...event, images });
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const fetchTrendingEventsDay = async (req, res) => {
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
};

export const fetchTrendingEventsWeek = async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM events WHERE creation_time >= NOW() - INTERVAL '1 week'`
        );

        const { trendingEvents, trendingTag, percentageOfTotalTags, numberOfTags } = getTrendingEvents(result.rows);
        res.json({ trending_tag: trendingTag, precentage_of_tags: percentageOfTotalTags, number_of_tags: numberOfTags, events: trendingEvents });
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const fetchKeywords = async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT UNNEST(keywords) AS keyword, COUNT(*) AS count
            FROM events
            GROUP BY keyword
            ORDER BY count DESC
        `);

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
};

export const searchEventsByLocation = async (req, res) => {
    const { longitude, latitude, radius } = req.query;

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
};

export const uploadImages = async (req, res) => {
    const { eventId } = req.body;
    const files = req.files;

    if (!eventId || !files || files.length === 0) {
        return res.status(400).json({ error: 'Event ID and image files are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const uploadPromises = files.map(file => {
            const id = uuidv7();
            const url = path.join('uploads', file.filename);
            return client.query(
                'INSERT INTO event_media (id, event_id, url) VALUES ($1, $2, $3)',
                [id, eventId, url]
            );
        });

        await Promise.all(uploadPromises);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Images uploaded successfully', files: files.map(file => file.filename) });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const fetchMetrics = async (req, res) => {
    const client = await pool.connect();
    try {
        // Number of events
        const eventsCountResult = await client.query('SELECT COUNT(*) FROM events');
        const eventsCount = parseInt(eventsCountResult.rows[0].count, 10);

        // Number of unique keywords
        const uniqueKeywordsResult = await client.query('SELECT COUNT(DISTINCT keyword) FROM (SELECT UNNEST(keywords) AS keyword FROM events) AS unique_keywords');
        const uniqueKeywordsCount = parseInt(uniqueKeywordsResult.rows[0].count, 10);

        // Total number of keywords
        const totalKeywordsResult = await client.query('SELECT COUNT(keyword) FROM (SELECT UNNEST(keywords) AS keyword FROM events) AS total_keywords');
        const totalKeywordsCount = parseInt(totalKeywordsResult.rows[0].count, 10);

        // Count of every keyword
        const keywordsCountResult = await client.query(`
            SELECT keyword, COUNT(*) AS count
            FROM (SELECT UNNEST(keywords) AS keyword FROM events) AS keyword_counts
            GROUP BY keyword
            ORDER BY count DESC
        `);
        const keywordsCount = keywordsCountResult.rows.reduce((acc, row) => {
            acc[row.keyword] = parseInt(row.count, 10);
            return acc;
        }, {});

        res.json({
            eventsCount,
            uniqueKeywordsCount,
            totalKeywordsCount,
            keywordsCount
        });
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};