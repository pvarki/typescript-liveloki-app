import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import routes from './routes/index.js';
import logger from './logger.js';
import session from 'express-session';
import { keycloak, memoryStore } from "./keycloak.js"; // Import Keycloak instance


const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

routes.use('/uploads/', express.static('/usr/src/app/uploads/'))

// Middleware
routes.use(express.static(path.join(dirname, 'public')));

// Routes
app.use(express.json());
app.use(config.baseUrl, routes);
app.use(
    session({
      secret: 'JotainPaskaaa',
      resave: false,
      saveUninitialized: true,
      store: memoryStore,
    })
  );

app.set( 'trust proxy', true );
app.use( keycloak.middleware() );

export default keycloak;

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
});
