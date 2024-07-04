import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { sessionMiddleware } from './middlewares/session.js';
import { keycloak } from './middlewares/keycloak.js';
import config from './config/index.js';
import routes from './routes/index.js';
import logger from './logger.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

routes.use('/uploads/', express.static('/usr/src/app/uploads/'))

// Middleware
routes.use(sessionMiddleware);
routes.use(keycloak.middleware());
routes.use(express.json());
routes.use(express.static(path.join(dirname, 'public')));

// Routes
app.use(config.baseUrl, routes);

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
});
