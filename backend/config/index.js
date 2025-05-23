import dotenv from 'dotenv';

dotenv.config();


const config = {
    baseUrl: process.env.BASE_URL || '/',
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
};

export default config;
