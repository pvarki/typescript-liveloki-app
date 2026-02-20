import dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value, defaultValue = false) => {
    if (value === undefined) {
        return defaultValue;
    }
    const normalized = String(value).trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const config = {
    baseUrl: process.env.BASE_URL || '/',
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    rmMtlsEnforce: parseBoolean(process.env.RM_MTLS_ENFORCE, false),
    rmMtlsHeader: process.env.RM_MTLS_HEADER || 'x-clientcert-dn',
    rmExpectedCertCn: process.env.RM_EXPECTED_CERT_CN || 'rasenmaeher',
};

export default config;
