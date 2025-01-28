import dotenv from 'dotenv';

dotenv.config();

if(process.env.POSTGRES_DB || process.env.POSTGRES_PASSWORD || process.env.POSTGRES_USER) {
    throw new Error('Legacy POSTGRES_* environment variables should not be set');
}

const config = {
    baseUrl: process.env.BASE_URL || '/',
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: process.env.SESSION_SECRET,
};

if(!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set');
}

if(!config.sessionSecret) {
    throw new Error('SESSION_SECRET is not set');
}

export default config;
