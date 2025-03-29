import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import routes from './routes/index.js';
import logger from './logger.js';
import session from 'express-session';
import { auth } from 'express-openid-connect';


const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const kcConfig = {
  authRequired: true,
  auth0Logout: true,
  baseURL: 'https://bl.localmaeher.dev.pvarki.fi:4666/',
  clientID: 'battlelog',
  issuerBaseURL: 'https://kc.localmaeher.dev.pvarki.fi:9443/realms/RASENMAEHER',
  secret: 'XbuFDTOjHm7DyROdSV4ofWpADA0VaxPi'
};

app.set( 'trust proxy', true );
app.use(auth(kcConfig));



routes.use('/uploads/', express.static('/usr/src/app/uploads/'))

// Middleware
routes.use(express.static(path.join(dirname, 'public')));

// Routes
app.use(express.json());
app.use(config.baseUrl, routes);





// Start the server
const PORT = config.port;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out')
});