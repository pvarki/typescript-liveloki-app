import Keycloak from 'keycloak-connect';
import config from '../config/index.js';

const keycloakConfig = {
    realm: config.keycloak.realm,
    "auth-server-url": config.keycloak['auth-server-url'],
    "ssl-required": config.keycloak['ssl-required'],
    resource: config.keycloak.resource,
    "public-client": config.keycloak['public-client'],
    "confidential-port": config.keycloak['confidential-port']
};

const keycloak = new Keycloak({}, keycloakConfig);

export { keycloak };