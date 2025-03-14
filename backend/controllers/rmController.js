import logger from '../logger.js';


export const checkHealth = async (req, res) => {
    try {
        res.send({"healthy": true});
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    }
};
