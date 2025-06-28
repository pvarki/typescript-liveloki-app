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
    // First, create a temporary column to store the converted data
    pgm.addColumns('events', {
        "groups_temp": { type: 'text[]' }
    });
    
    // Convert existing single group values to arrays
    pgm.sql(`
        UPDATE events 
        SET groups_temp = CASE 
            WHEN "group" IS NOT NULL AND "group" != '' 
            THEN ARRAY["group"] 
            ELSE ARRAY[]::text[] 
        END
    `);
    
    // Drop the old group column
    pgm.dropColumns('events', ['group']);
    
    // Rename the temporary column to groups
    pgm.renameColumn('events', 'groups_temp', 'groups');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Create a temporary single group column
    pgm.addColumns('events', {
        "group_temp": { type: 'text' }
    });
    
    // Convert arrays back to single values (take the first group)
    pgm.sql(`
        UPDATE events 
        SET group_temp = CASE 
            WHEN array_length(groups, 1) > 0 
            THEN groups[1] 
            ELSE NULL 
        END
    `);
    
    // Drop the groups column
    pgm.dropColumns('events', ['groups']);
    
    // Rename the temporary column back to group
    pgm.renameColumn('events', 'group_temp', 'group');
};
