/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql('CREATE EXTENSION IF NOT EXISTS postgis;');

    pgm.createTable('events', {
        id: { type: 'uuid', primaryKey: true, notNull: true },
        header: { type: 'text', notNull: true },
        link: { type: 'text' },
        source: { type: 'text' },
        admiralty_reliability: { type: 'text' },
        admiralty_accuracy: { type: 'text' },
        keywords: { type: 'text[]' },
        event_time: { type: 'text' },
        creation_time: { type: 'timestamp with time zone', default: pgm.func('now()') },
        notes: { type: 'text' },
        hcoe_domains: { type: 'text[]' },
        location: { type: 'text' },
        location_lng: { type: 'float' },
        location_lat: { type: 'float' },
        author: { type: 'text' },
        groups: { type: 'text[]' },
        type: { type: 'text' },
        data: { type: 'jsonb' },
    });

    pgm.createTable('event_media', {
        id: { type: 'uuid', primaryKey: true, notNull: true },
        event_id: {
            type: 'uuid',
            notNull: true,
            references: 'events(id)',
        },
        url: { type: 'text', notNull: true },
    });

    pgm.createTable('dashboards', {
        id: { type: 'uuid', primaryKey: true, notNull: true },
        name: { type: 'text', notNull: true },
        cols: { type: 'integer', notNull: true, default: 24 },
        row_height: { type: 'integer', notNull: true, default: 50 },
        layout: { type: 'jsonb', notNull: true, default: '[]' },
        settings: { type: 'jsonb', notNull: true, default: '{}' },
        created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
    });

    pgm.createTable('bl_users', {
        cn: { type: 'varchar(255)', primaryKey: true, notNull: true },
        rm_uuid: { type: 'uuid' },
        callsign: { type: 'varchar(255)' },
        is_admin: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
    });
    // enter mock data
    if (process.env.PRESEED === 'true') {
        console.log('Preseeding database with events from /tmp/preseed.csv');
        pgm.sql(`
            COPY events (id,header,link,source,admiralty_reliability,admiralty_accuracy,keywords,event_time,notes,hcoe_domains,author,location,location_lng,location_lat,creation_time,groups)
            FROM '/tmp/preseed.csv'
            DELIMITER ','
            CSV HEADER;
        `);
    }
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('bl_users');
    pgm.dropTable('dashboards');
    pgm.dropTable('event_media');
    pgm.dropTable('events');
};
