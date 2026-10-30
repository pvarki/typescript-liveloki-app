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
    // PostGIS is provisioned outside the application in production environments
    // such as CloudNativePG, and the app role does not have permission to create
    // extensions there. The current schema no longer depends on PostGIS types, so
    // this historical migration is intentionally a no-op.

    // If you need to use PostGIS types, you can create the extension manually with init script elsewhere.
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
