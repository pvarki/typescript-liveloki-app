import pool from '../models/pool.js';
import { convertTagArray, getTrendingEvents } from '../utils/helpers.js';
import { v7 as uuidv7 } from 'uuid';
import path from 'path';
import logger from '../logger.js';


export const checkHealth = async (req, res) => {
    try {
        res.send({"healthy": true});

    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    } finally {
    }
};