import pg from 'pg';
import config from '../config/index.js';

const pool = new pg.Pool({
    connectionString: config.databaseUrl,
});

export default pool;
