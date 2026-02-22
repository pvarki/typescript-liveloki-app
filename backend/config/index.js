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

const manifestRmCertCn = getManifestRmCertCn();

const config = {
    baseUrl: process.env.BASE_URL || '/',
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    rmMtlsEnforce: parseBoolean(process.env.RM_MTLS_ENFORCE, false),
    rmMtlsHeader: process.env.RM_MTLS_HEADER || 'x-clientcert-dn',
    rmExpectedCertCn: process.env.RM_EXPECTED_CERT_CN || manifestRmCertCn || 'rasenmaeher',
    mainUiCardVisible: parseBoolean(process.env.BL_MAIN_UI_CARD_VISIBLE, false),
};

export default config;
