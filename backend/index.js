import config from './config/index.js';
import { createApp } from './app.js';
import logger from './logger.js';
import { createTakService } from './services/tak/takService.js';

const app = createApp(config);
const takService = createTakService(config.tak, { logger });
app.locals.takService = takService;

// Start the server
const PORT = config.port;
const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
    takService.start();
});

const shutdown = () => {
    takService.stop();
    server.close(() => {
        process.exitCode = 0;
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
