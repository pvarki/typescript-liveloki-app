import dotenv from 'dotenv';
import { getManifestRmCertCn } from '../utils/kraftwerkManifest.js';

dotenv.config();

const parseBoolean = (value, defaultValue = false) => {
    if (value === undefined) {
        return defaultValue;
    }
    const normalized = String(value).trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};


const parseInteger = (value, defaultValue, min = 0) => {
    if (value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed) || parsed < min) {
        return defaultValue;
    }
    return parsed;
};

const parseTrustProxyHops = (value, defaultValue = 1) => {
    if (value === undefined) {
        return defaultValue;
    }
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) {
        return defaultValue;
    }
    if (normalized === 'true' || normalized === 'yes' || normalized === 'on') {
        return 1;
    }
    if (normalized === 'false' || normalized === 'no' || normalized === 'off') {
        return false;
    }
    const hops = Number.parseInt(normalized, 10);
    if (Number.isNaN(hops) || hops < 0) {
        return defaultValue;
    }
    return hops;
};

const manifestRmCertCn = getManifestRmCertCn();

const config = {
    baseUrl: process.env.BASE_URL || '/',
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    trustProxyHops: parseTrustProxyHops(process.env.BL_TRUST_PROXY_HOPS, 1),
    rmMtlsEnforce: parseBoolean(process.env.RM_MTLS_ENFORCE, false),
    rmMtlsHeader: process.env.RM_MTLS_HEADER || 'x-clientcert-dn',
    rmExpectedCertCn: process.env.RM_EXPECTED_CERT_CN || manifestRmCertCn || 'rasenmaeher',
    rmMtlsUserEnforce: parseBoolean(process.env.RM_MTLS_USER_ENFORCE, true),
    mainUiCardVisible: parseBoolean(process.env.BL_MAIN_UI_CARD_VISIBLE, false),
    tak: {
        enabled: parseBoolean(process.env.TAK_ENABLED, false),
        host: process.env.TAK_HOST || 'takserver',
        serverName: process.env.TAK_TLS_SERVERNAME || process.env.TAK_HOST || 'takserver',
        port: parseInteger(process.env.TAK_STREAM_PORT, 8089, 1),
        tls: parseBoolean(process.env.TAK_STREAM_TLS, true),
        clientP12Path: process.env.TAK_CLIENT_P12_PATH || '',
        clientP12Password: process.env.TAK_CLIENT_P12_PASSWORD || '',
        clientCertPath: process.env.TAK_CLIENT_CERT_PATH || '',
        clientKeyPath: process.env.TAK_CLIENT_KEY_PATH || '',
        clientKeyPassword: process.env.TAK_CLIENT_KEY_PASSWORD || process.env.TAK_CLIENT_P12_PASSWORD || '',
        caPath: process.env.TAK_CA_PATH || '',
        rejectUnauthorized: parseBoolean(process.env.TAK_REJECT_UNAUTHORIZED, true),
        markerTtlSeconds: parseInteger(process.env.TAK_MARKER_TTL_SECONDS, 600, 1),
        reconnectMs: parseInteger(process.env.TAK_RECONNECT_MS, 5000, 100),
        publishStaleSeconds: parseInteger(process.env.TAK_PUBLISH_STALE_SECONDS, 31_536_000, 1),
        dbPoll: {
            enabled: parseBoolean(process.env.TAK_DB_POLL_ENABLED, false),
            connectionString: process.env.TAK_DB_URL || '',
            host: process.env.TAK_DB_HOST || process.env.POSTGRES_ADDRESS || 'takdb',
            port: parseInteger(process.env.TAK_DB_PORT, 5432, 1),
            database: process.env.TAK_DB_NAME || process.env.POSTGRES_DB || 'cot',
            user: process.env.TAK_DB_USER || process.env.POSTGRES_USER || 'martiuser',
            password: process.env.TAK_DB_PASSWORD || process.env.POSTGRES_PASSWORD || '',
            pollMs: parseInteger(process.env.TAK_DB_POLL_MS, 1000, 250),
            queryLimit: parseInteger(process.env.TAK_DB_QUERY_LIMIT, 1000, 1),
        },
    },
};

export default config;
