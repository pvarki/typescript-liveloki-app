import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const keycloakConfigPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'keycloak.json');
const keycloakConfig = JSON.parse(fs.readFileSync(keycloakConfigPath, 'utf8'));

const config = {
    baseUrl: process.env.BASE_URL || '/',
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: process.env.SESSION_SECRET,
    keycloak: {
        realm: keycloakConfig.realm,
        serverUrl: keycloakConfig['auth-server-url'],
        sslRequired: keycloakConfig['ssl-required'],
        resource: keycloakConfig.resource,
        publicClient: keycloakConfig['public-client'],
        confidentialPort: keycloakConfig['confidential-port']
    },
};

export default config;
