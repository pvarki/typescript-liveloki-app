import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();


const config = {
    baseUrl: process.env.BASE_URL || '/',
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: process.env.SESSION_SECRET,
};

export default config;
