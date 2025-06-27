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
    pgm.sql(`
      COPY events (id,header,link,source,admiralty_reliability,admiralty_accuracy,keywords,event_time,notes,hcoe_domains,author,location,location_lng,location_lat,creation_time)
      FROM '/tmp/preseed.csv'
      DELIMITER ','
      CSV HEADER;
    `);
  };

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
