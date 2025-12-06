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
  pgm.createTable('harvester_config', {
    id: { type: 'integer', primaryKey: true, notNull: true },
    enabled: { type: 'boolean', notNull: true, default: false },
    keywords: { type: 'text[]', notNull: true, default: pgm.func("ARRAY[]::text[]") },
  });

  pgm.sql(`
    INSERT INTO harvester_config (id, enabled, keywords)
    VALUES (1, FALSE, ARRAY[]::text[])
    ON CONFLICT (id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('harvester_config');
};
