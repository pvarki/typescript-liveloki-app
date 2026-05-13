import pg from 'pg';

import { parseCotDatabaseRow } from './cotMarkerParser.js';

const { Pool } = pg;

const DEFAULT_QUERY_LIMIT = 1000;

const LATEST_MARKERS_QUERY = `
    SELECT DISTINCT ON (uid)
        uid,
        cot_type AS type,
        ST_Y(event_pt)::float8 AS lat,
        ST_X(event_pt)::float8 AS lng,
        point_hae::float8 AS hae,
        time,
        stale,
        detail
    FROM cot_router
    WHERE uid IS NOT NULL
        AND event_pt IS NOT NULL
        AND (stale IS NULL OR stale > now())
        AND cot_type LIKE 'a-%'
    ORDER BY uid, id DESC
    LIMIT $1
`;

export class TakCotDatabasePoller {
    constructor(config, logger = console) {
        this.config = config;
        this.logger = logger;
        this.pool = null;
        this.timer = null;
        this.stopped = true;
        this.polling = false;
        this.listeners = new Map();
    }

    on(eventName, listener) {
        const listeners = this.listeners.get(eventName) ?? [];
        listeners.push(listener);
        this.listeners.set(eventName, listeners);
    }

    emit(eventName, payload) {
        for (const listener of this.listeners.get(eventName) ?? []) {
            listener(payload);
        }
    }

    start() {
        if (this.pool || !this.stopped) return;
        this.stopped = false;
        const poolConfig = { ...this.config };
        delete poolConfig.pollMs;
        delete poolConfig.queryLimit;
        this.pool = new Pool(poolConfig);
        this.poll();
    }

    async stop() {
        this.stopped = true;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        const pool = this.pool;
        this.pool = null;
        if (pool) await pool.end();
    }

    scheduleNextPoll() {
        if (this.stopped || this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.poll();
        }, this.config.pollMs);
    }

    async poll() {
        if (this.stopped || this.polling || !this.pool) return;
        this.polling = true;
        try {
            const result = await this.pool.query(LATEST_MARKERS_QUERY, [
                this.config.queryLimit ?? DEFAULT_QUERY_LIMIT,
            ]);
            for (const row of result.rows) {
                const marker = parseCotDatabaseRow(row);
                if (marker) this.emit('marker', marker);
            }
            this.emit('polled', { markerCount: result.rowCount });
        } catch (error) {
            this.emit('error', error);
        } finally {
            this.polling = false;
            this.scheduleNextPoll();
        }
    }
}

export function createTakCotDatabasePoller(config, logger) {
    return new TakCotDatabasePoller(config, logger);
}
