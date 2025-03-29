import Keycloak from "keycloak-connect";
import session from "express-session";

const memoryStore = new session.MemoryStore();

const kcConfig = {
    "realm": "RASENMAEHER",
    "auth-server-url": "https://kc.localmaeher.dev.pvarki.fi:9443/",
    "resource": "battlelog",
    "verify-token-audience": true,
    "credentials": {
      "secret": "rcuwg9jxGaeEu36dhneuJSQktIUXoKZA"
    },
    "confidential-port": 0,
    "policy-enforcer": {
      "credentials": {}
    }
  }

const keycloak = new Keycloak({ store: memoryStore }, kcConfig);

export { keycloak, memoryStore };