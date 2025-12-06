/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | void}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('harvester_preview_events', {
    id: 'id',
    payload: { type: 'jsonb', notNull: true },
    inserted_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('harvester_preview_events', 'inserted_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | void}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('harvester_preview_events');
};
