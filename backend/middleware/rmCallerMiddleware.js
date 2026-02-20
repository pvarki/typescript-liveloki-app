import config from '../config/index.js';
import logger from '../logger.js';

const parseDistinguishedName = (rawDn) => {
    if (typeof rawDn !== 'string' || !rawDn.trim()) {
        return {};
    }

    const dnEntries = rawDn.startsWith('/')
        ? rawDn.slice(1).split('/').filter(Boolean)
        : rawDn.split(',');

    const parsed = {};
    for (const entry of dnEntries) {
        const trimmed = entry.trim();
        if (!trimmed) {
            continue;
        }
        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex < 1) {
            continue;
        }
        const key = trimmed.slice(0, separatorIndex).trim().toUpperCase();
        const value = trimmed.slice(separatorIndex + 1).trim();
        if (!key || !value || parsed[key]) {
            continue;
        }
        parsed[key] = value;
    }

    return parsed;
};

export const requireRmCaller = (req, res, next) => {
    if (!config.rmMtlsEnforce) {
        next();
        return;
    }

    const rawDn = req.get(config.rmMtlsHeader);
    if (!rawDn) {
        logger.warn('Rejected RM API request due to missing mTLS DN header');
        res.status(401).json({ success: false, error: 'Missing mTLS client certificate header' });
        return;
    }

    const parsedDn = parseDistinguishedName(rawDn);
    const certCn = parsedDn.CN;
    if (!certCn) {
        logger.warn('Rejected RM API request due to malformed mTLS DN header');
        res.status(401).json({ success: false, error: 'Invalid mTLS client certificate header' });
        return;
    }

    if (certCn !== config.rmExpectedCertCn) {
        logger.warn(`Rejected RM API request from CN=${certCn}, expected CN=${config.rmExpectedCertCn}`);
        res.status(403).json({ success: false, error: 'Unexpected mTLS client certificate CN' });
        return;
    }

    req.rmClientCert = { rawDn, parsedDn, certCn };
    next();
};
