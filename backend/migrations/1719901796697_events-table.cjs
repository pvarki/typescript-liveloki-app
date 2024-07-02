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
    pgm.createTable('events', {
        id: {type: 'uuid', primaryKey: true, notNull: true},
        header: {type: 'text', notNull: true},
        link: {type: 'text'},
        source: {type: 'text'},
        admiralty_reliability: {type: 'text'},
        admiralty_accuracy: {type: 'text'},
        keywords: {type: 'text[]'},
        event_time: {type: 'text'},
        creation_time: {type: 'timestamp with time zone default now()'}
    })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
