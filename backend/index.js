import config from './config/index.js';
import { createApp } from './app.js';
import logger from './logger.js';

const app = createApp(config);

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
});
