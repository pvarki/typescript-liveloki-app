/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('bl_users', {
        cn: { type: 'varchar(255)', primaryKey: true, notNull: true },
        rm_uuid: { type: 'uuid' },
        callsign: { type: 'varchar(255)' },
        is_admin: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('bl_users');
};
