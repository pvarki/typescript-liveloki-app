import pool from '../models/pool.js';
import logger from '../logger.js';

const previewClients = new Set();

const sendPreviewToClients = (rows) => {
  if (!rows || rows.length === 0) return;

  const payloads = rows.map((row) => ({
    id: row.id,
    inserted_at: row.inserted_at,
    event: row.payload,
  }));

  for (const res of previewClients) {
    for (const item of payloads) {
      res.write(`data: ${JSON.stringify(item)}\n\n`);
    }
  }
};

export const getHarvesterConfig = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT enabled, keywords FROM harvester_config WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ enabled: false, keywords: [] });
    }

    const row = result.rows[0];
    res.json({ enabled: row.enabled, keywords: row.keywords ?? [] });
  } catch (error) {
    logger.error('Error fetching harvester config: ' + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const updateHarvesterConfig = async (req, res) => {
  const { enabled, keywords } = req.body ?? {};

  let keywordsArray = undefined;
  if (Array.isArray(keywords)) {
    keywordsArray = keywords
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter((k) => k.length > 0);
  } else if (typeof keywords === 'string') {
    keywordsArray = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO harvester_config (id, enabled, keywords)
       VALUES (1, COALESCE($1, FALSE), COALESCE($2, ARRAY[]::text[]))
       ON CONFLICT (id) DO UPDATE
       SET enabled = COALESCE($1, harvester_config.enabled),
           keywords = COALESCE($2, harvester_config.keywords)`,
      [
        typeof enabled === 'boolean' ? enabled : null,
        keywordsArray ?? null,
      ],
    );

    // When config (especially keywords) changes, clear old preview entries so
    // the preview view reflects only events generated under the new filter.
    await client.query('DELETE FROM harvester_preview_events');

    const result = await client.query('SELECT enabled, keywords FROM harvester_config WHERE id = 1');
    await client.query('COMMIT');

    const row = result.rows[0];
    res.json({ enabled: row.enabled, keywords: row.keywords ?? [] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating harvester config: ' + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const ingestHarvesterPreview = async (req, res) => {
  const { events } = req.body ?? {};

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Request body must contain a non-empty "events" array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertedRows = [];
    // Insert events sequentially so we can collect RETURNING rows for SSE
    for (const event of events) {
      const result = await client.query(
        'INSERT INTO harvester_preview_events (payload) VALUES ($1) RETURNING id, payload, inserted_at',
        [event],
      );
      insertedRows.push(...result.rows);
    }

    await client.query('COMMIT');

    // Push freshly inserted rows to any connected SSE clients
    sendPreviewToClients(insertedRows);

    res.status(201).json({ message: 'Preview events ingested successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error ingesting harvester preview events: ' + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const getHarvesterPreview = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, payload, inserted_at
       FROM harvester_preview_events
       ORDER BY inserted_at DESC
       LIMIT 50`,
    );

    const preview = result.rows.map((row) => ({
      id: row.id,
      inserted_at: row.inserted_at,
      event: row.payload,
    }));

    res.json(preview);
  } catch (error) {
    logger.error('Error fetching harvester preview events: ' + error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const streamHarvesterPreview = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // If using a proxy that buffers, a first write helps establish the stream
  res.flushHeaders?.();
  res.write('\n');

  previewClients.add(res);

  req.on('close', () => {
    previewClients.delete(res);
  });
};
