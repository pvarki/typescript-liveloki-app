import session from 'express-session';
import config from '../config/index.js';

const memoryStore = new session.MemoryStore();

export const sessionMiddleware = session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
});
