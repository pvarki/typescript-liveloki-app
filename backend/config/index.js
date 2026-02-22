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
    mainUiCardVisible: parseBoolean(process.env.BL_MAIN_UI_CARD_VISIBLE, false),
};

export default config;
