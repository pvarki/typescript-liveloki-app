import { v7 as uuidv7 } from 'uuid';

import logger from '../logger.js';
import pool from '../models/pool.js';

const DEFAULT_COLS = 24;
const DEFAULT_ROW_HEIGHT = 50;
const DEFAULT_SETTINGS = Object.freeze({
  gap: 4,
  padding: 4,
  widgetBorders: 'subtle',
  widgetHeaders: 'edit-only',
});
const VALID_GAPS = new Set([0, 2, 4, 8]);
const VALID_PADDING = new Set([0, 4, 8, 16]);
const VALID_WIDGET_BORDERS = new Set(['none', 'subtle', 'visible']);
const VALID_WIDGET_HEADERS = new Set(['always', 'edit-only', 'never']);

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeLayout(layout = '[]') {
  if (typeof layout === 'string') {
    try {
      const parsed = JSON.parse(layout);
      if (!Array.isArray(parsed)) throw new Error('layout must be an array');
      return JSON.stringify(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const validationError = new Error(`Invalid dashboard layout: ${message}`);
      validationError.statusCode = 400;
      throw validationError;
    }
  }

  if (!Array.isArray(layout)) {
    const validationError = new Error('Invalid dashboard layout: layout must be an array');
    validationError.statusCode = 400;
    throw validationError;
  }

  return JSON.stringify(layout);
}

function parseSettings(settings) {
  if (typeof settings === 'string') {
    try {
      const parsed = JSON.parse(settings);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : null;
}

function normalizeSettings(settings, fallback = DEFAULT_SETTINGS) {
  const source = parseSettings(settings);
  const base = { ...DEFAULT_SETTINGS, ...fallback };
  if (!source) return base;

  return {
    gap: VALID_GAPS.has(source.gap) ? source.gap : base.gap,
    padding: VALID_PADDING.has(source.padding) ? source.padding : base.padding,
    widgetBorders: VALID_WIDGET_BORDERS.has(source.widgetBorders) ? source.widgetBorders : base.widgetBorders,
    widgetHeaders: VALID_WIDGET_HEADERS.has(source.widgetHeaders) ? source.widgetHeaders : base.widgetHeaders,
  };
}

function toDashboard(row) {
  return {
    id: row.id,
    name: row.name,
    cols: row.cols,
    rowHeight: row.row_height,
    settings: normalizeSettings(row.settings),
    layout: typeof row.layout === 'string' ? row.layout : JSON.stringify(row.layout ?? []),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export const listDashboards = async (_request, response) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM dashboards ORDER BY created_at ASC');
    response.json(result.rows.map((row) => toDashboard(row)));
  } catch (error) {
    logger.error(`Error listing dashboards: ${error.message}`);
    response.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const createDashboard = async (request, response) => {
  const client = await pool.connect();
  try {
    const id = uuidv7();
    const name = request.body?.name || 'Untitled Dashboard';
    const cols = parsePositiveInteger(request.body?.cols, DEFAULT_COLS);
    const rowHeight = parsePositiveInteger(request.body?.rowHeight ?? request.body?.row_height, DEFAULT_ROW_HEIGHT);
    const layout = normalizeLayout(request.body?.layout ?? '[]');
    const settings = normalizeSettings(request.body?.settings);

    const result = await client.query(
      `INSERT INTO dashboards (id, name, cols, row_height, layout, settings)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       RETURNING *`,
      [id, name, cols, rowHeight, layout, JSON.stringify(settings)],
    );

    response.status(201).json(toDashboard(result.rows[0]));
  } catch (error) {
    const status = error.statusCode || 500;
    logger.error(`Error creating dashboard: ${error.message}`);
    response.status(status).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const getDashboard = async (request, response) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM dashboards WHERE id = $1', [request.params.id]);
    if (result.rows.length === 0) return response.status(404).json({ error: 'Dashboard not found' });
    return response.json(toDashboard(result.rows[0]));
  } catch (error) {
    logger.error(`Error fetching dashboard: ${error.message}`);
    return response.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const updateDashboard = async (request, response) => {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT * FROM dashboards WHERE id = $1', [request.params.id]);
    if (existing.rows.length === 0) return response.status(404).json({ error: 'Dashboard not found' });

    const current = existing.rows[0];
    const name = request.body?.name ?? current.name;
    const cols = parsePositiveInteger(request.body?.cols, current.cols);
    const rowHeight = parsePositiveInteger(request.body?.rowHeight ?? request.body?.row_height, current.row_height);
    const layout = normalizeLayout(request.body?.layout ?? current.layout ?? []);
    const settings = normalizeSettings(request.body?.settings, normalizeSettings(current.settings));

    const result = await client.query(
      `UPDATE dashboards
       SET name = $1, cols = $2, row_height = $3, layout = $4::jsonb, settings = $5::jsonb, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, cols, rowHeight, layout, JSON.stringify(settings), request.params.id],
    );

    return response.json(toDashboard(result.rows[0]));
  } catch (error) {
    const status = error.statusCode || 500;
    logger.error(`Error updating dashboard: ${error.message}`);
    return response.status(status).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const deleteDashboard = async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM dashboards WHERE id = $1', [request.params.id]);
    response.json({ success: true });
  } catch (error) {
    logger.error(`Error deleting dashboard: ${error.message}`);
    response.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const deleteAllDashboards = async (_request, response) => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM dashboards');
    response.json({ success: true });
  } catch (error) {
    logger.error(`Error deleting dashboards: ${error.message}`);
    response.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
