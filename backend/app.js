import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import routes from './routes/index.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const createApp = (appConfig = config) => {
    const app = express();

    app.set('trust proxy', appConfig.trustProxyHops);

    routes.use('/uploads/', express.static('/usr/src/app/uploads/'));
    routes.use(express.static(path.join(dirname, 'public')));

    app.use(express.json());
    app.use(appConfig.baseUrl, routes);

    return app;
};
