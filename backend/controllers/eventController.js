import pool from "../models/pool.js";
import { convertTagArray, getTrendingEvents } from "../utils/helpers.js";
import { v7 as uuidv7 } from "uuid";
import path from "path";
import logger from "../logger.js";

export const addEvents = async (req, res) => {
  const { events } = req.body;

  if (!Array.isArray(events)) {
    logger.error("Invalid input format");
    return res.status(400).json({ error: "Invalid input format" });
  }

  const client = await pool.connect();

  // Check that all events have a "header" field, as otherwise the database will not like it.
  const invalidEvents = events.filter(event => !event.header);
  if (invalidEvents.length > 0) {
    logger.error("Events missing required header field");
    return res.status(400).json({ error: "All events must have a header field" });
  }

  try {
    await client.query("BEGIN");

    const eventPromises = events.map(event => {
      const {
        header,
        link,
        source,
        admiralty_reliability,
        admiralty_accuracy,
        keywords,
        event_time,
        notes,
        hcoe_domains,
        location,
        location_lng,
        location_lat,
        author,
        groups
      } = event;
      const id = uuidv7();
      const keywordArray = convertTagArray(keywords);
      const groupsArray = groups ? (Array.isArray(groups) ? groups : [groups]) : [];

      return client.query(
        "INSERT INTO events (id, header, link, source, admiralty_reliability, admiralty_accuracy, keywords, event_time, notes, hcoe_domains, location, location_lng, location_lat, author, groups) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
        [id, header, link, source, admiralty_reliability, admiralty_accuracy, keywordArray, event_time, notes, hcoe_domains, location, location_lng, location_lat, author, groupsArray]
      );
    });

    await Promise.all(eventPromises);

    await client.query("COMMIT");
    logger.info("Events added successfully");
    res.status(201).json({ message: "Events added successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("ROLLBACK: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const fetchEvents = async (req, res) => {
  const { search } = req.query;

  const client = await pool.connect();
  try {
    let query = "SELECT * FROM events";
    const values = [];

    if (search) {
      const searchWords = search.split(" ").map(word => word.trim()).filter(Boolean);

      if (searchWords.length > 0) {
        const conditions = searchWords.map((_, index) => `
                    (
                        EXISTS (SELECT 1 FROM unnest(keywords) AS keyword WHERE keyword ILIKE $${index + 1}) OR
                        header ILIKE $${index + 1} OR
                        notes ILIKE $${index + 1} OR
                        EXISTS (SELECT 1 FROM unnest(hcoe_domains) AS domain WHERE domain ILIKE $${index + 1}) OR
                        link ILIKE $${index + 1} OR
                        source ILIKE $${index + 1}
                    )
                `);

        query += ` WHERE ${conditions.join(" AND ")}`;
        values.push(...searchWords.map(word => `%${word}%`));
      }
    }

    query += " ORDER BY creation_time DESC";

    const result = await client.query(query, values);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};


export const fetchEventById = async (req, res) => {
  const client = await pool.connect();
  const eventId = req.params.id;

  try {
    const eventResult = await client.query("SELECT * FROM events WHERE id = $1", [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0];

    const imagesResult = await client.query("SELECT url FROM event_media WHERE event_id = $1", [eventId]);
    const images = imagesResult.rows.map(row => row.url);

    res.json({ ...event, images });
  } catch (error) {
    logger.error("Error: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const fetchTrendingEventsDay = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT *
       FROM events
       WHERE creation_time >= NOW() - INTERVAL '24 hours'`
    );

    const {
      trendingEvents,
      trendingTag,
      percentageOfTotalTags,
      numberOfTags
    } = getTrendingEvents(result.rows);
    res.json({
      trending_tag: trendingTag,
      precentage_of_tags: percentageOfTotalTags,
      number_of_tags: numberOfTags,
      events: trendingEvents
    });
  } catch (error) {
    logger.error("Error: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const fetchTrendingEventsWeek = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT *
       FROM events
       WHERE creation_time >= NOW() - INTERVAL '1 week'`
    );

    const {
      trendingEvents,
      trendingTag,
      percentageOfTotalTags,
      numberOfTags
    } = getTrendingEvents(result.rows);
    res.json({
      trending_tag: trendingTag,
      precentage_of_tags: percentageOfTotalTags,
      number_of_tags: numberOfTags,
      events: trendingEvents
    });
  } catch (error) {
    logger.error("Error: " + error.message);
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
    for (const row of result.rows) {
      keywordsWithCount[row.keyword] = parseInt(row.count, 10);
    }

    res.json(keywordsWithCount);
  } catch (error) {
    logger.error("Error: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const searchEventsByLocation = async (req, res) => {
  const { longitude, latitude, radius } = req.query;

  if (!longitude || !latitude || !radius) {
    return res.status(400).json({ error: "Longitude, latitude, and radius are required" });
  }

  const client = await pool.connect();
  try {
    const query = `
      SELECT *
      FROM events
      WHERE ST_DWithin(
              ST_SetSRID(ST_MakePoint($1, $2), 4326) ::geography,
              ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326) ::geography,
              $3 * 1000
            )
      ORDER BY creation_time DESC
    `;
    const values = [longitude, latitude, radius];

    const result = await client.query(query, values);
    res.json(result.rows);
  } catch (error) {
    logger.error("Error: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const uploadImages = async (req, res) => {
  const { eventId } = req.body;
  const files = req.files;

  if (!eventId || !files || files.length === 0) {
    return res.status(400).json({ error: "Event ID and image files are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const uploadPromises = files.map(file => {
      const id = uuidv7();
      const url = path.join("uploads", file.filename);
      return client.query(
        "INSERT INTO event_media (id, event_id, url) VALUES ($1, $2, $3)",
        [id, eventId, url]
      );
    });

    await Promise.all(uploadPromises);

    await client.query("COMMIT");
    res.status(201).json({
      message: "Images uploaded successfully",
      files: files.map(file => file.filename)
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const fetchMetrics = async (req, res) => {
  const client = await pool.connect();
  try {
    // Number of events
    const eventsCountResult = await client.query("SELECT COUNT(*) FROM events");
    const eventsCount = parseInt(eventsCountResult.rows[0].count, 10);

    // Number of unique keywords
    const uniqueKeywordsResult = await client.query("SELECT COUNT(DISTINCT keyword) FROM (SELECT UNNEST(keywords) AS keyword FROM events) AS unique_keywords");
    const uniqueKeywordsCount = parseInt(uniqueKeywordsResult.rows[0].count, 10);

    // Total number of keywords
    const totalKeywordsResult = await client.query("SELECT COUNT(keyword) FROM (SELECT UNNEST(keywords) AS keyword FROM events) AS total_keywords");
    const totalKeywordsCount = parseInt(totalKeywordsResult.rows[0].count, 10);

    // Count of every keyword
    const keywordsCountResult = await client.query(`
      SELECT keyword, COUNT(*) AS count
      FROM (SELECT UNNEST(keywords) AS keyword FROM events) AS keyword_counts
      GROUP BY keyword
      ORDER BY count DESC
    `);
    // eslint-disable-next-line unicorn/no-array-reduce
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
    logger.error("Error: " + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Group management functions
export const createGroup = async (req, res) => {
    const { eventIds, groupName } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0 || !groupName) {
        return res.status(400).json({ error: 'Event IDs array and group name are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add the group name to the groups array for all specified events
        const updateQuery = `
            UPDATE events 
            SET groups = CASE 
                WHEN groups IS NULL THEN ARRAY[$1]
                ELSE array_append(groups, $1)
            END
            WHERE id = ANY($2) AND NOT ($1 = ANY(groups))
        `;
        await client.query(updateQuery, [groupName, eventIds]);

        await client.query('COMMIT');
        logger.info(`Group "${groupName}" added to ${eventIds.length} events`);
        res.status(201).json({ message: `Group "${groupName}" added successfully`, groupName, eventCount: eventIds.length });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error creating group: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const updateEventGroup = async (req, res) => {
    const { eventId } = req.params;
    const { groupName } = req.body;

    if (!groupName) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(`
            UPDATE events 
            SET groups = CASE 
                WHEN groups IS NULL THEN ARRAY[$1]
                ELSE array_append(groups, $1)
            END
            WHERE id = $2 AND NOT ($1 = ANY(groups))
            RETURNING *
        `, [groupName, eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found or already in group' });
        }

        logger.info(`Event ${eventId} added to group "${groupName}"`);
        res.json({ message: 'Event group updated successfully', event: result.rows[0] });
    } catch (error) {
        logger.error('Error updating event group: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const fetchGroups = async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT unnest(groups) as group_name, COUNT(*) as event_count
            FROM events 
            WHERE groups IS NOT NULL AND array_length(groups, 1) > 0
            GROUP BY group_name
            ORDER BY group_name
        `);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching groups: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const fetchEventsByGroup = async (req, res) => {
    const { groupName } = req.params;

    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM events WHERE $1 = ANY(groups) ORDER BY creation_time DESC', [groupName]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: `No events found in group "${groupName}"` });
        }

        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching events by group: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const removeFromGroup = async (req, res) => {
    const { eventId } = req.params;
    const { groupName } = req.body;

    if (!groupName) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(`
            UPDATE events 
            SET groups = array_remove(groups, $1)
            WHERE id = $2
            RETURNING *
        `, [groupName, eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        logger.info(`Event ${eventId} removed from group "${groupName}"`);
        res.json({ message: 'Event removed from group successfully', event: result.rows[0] });
    } catch (error) {
        logger.error('Error removing event from group: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};
