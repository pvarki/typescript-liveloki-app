import Keycloak from 'keycloak-connect';
import config from '../config/index.js';

const keycloak = new Keycloak({}, {
    realm: config.keycloak.realm,
    'auth-server-url': config.keycloak.serverUrl,
    'ssl-required': config.keycloak.sslRequired,
    resource: config.keycloak.resource,
    'public-client': config.keycloak.publicClient,
    'confidential-port': config.keycloak.confidentialPort
});

export { keycloak };
