import http from 'http';
import config from './config/index.js';
import { createApp } from './app.js';
import logger from './logger.js';
import { routeWebSocketUpgrade } from './routes/wsRoutes.js';

const app = createApp(config);
const server = http.createServer(app);

server.on('upgrade', (request, socket) => {
    if (!routeWebSocketUpgrade(request, socket)) {
        socket.destroy();
    }
});

// Start the server
const PORT = config.port;
server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
});
