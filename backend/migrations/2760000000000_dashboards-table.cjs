/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('dashboards', {
        id: { type: 'uuid', primaryKey: true, notNull: true },
        name: { type: 'text', notNull: true },
        cols: { type: 'integer', notNull: true, default: 24 },
        row_height: { type: 'integer', notNull: true, default: 50 },
        layout: { type: 'jsonb', notNull: true, default: '[]' },
        created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('dashboards');
};
