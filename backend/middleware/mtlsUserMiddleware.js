import config from '../config/index.js';
import logger from '../logger.js';
import { findUserByCn, createUser } from '../models/users.js';

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

export const createMtlsUserMiddleware = (options = {}) => {
    const enforce = options.enforce ?? config.rmMtlsUserEnforce;
    const header = options.header ?? config.rmMtlsHeader;

    return async (req, res, next) => {
        if (!enforce) {
            req.user = { cn: 'unknown', isAdmin: true, rmUuid: null, callsign: null };
            next();
            return;
        }

        const rawDn = req.get(header);
        if (!rawDn) {
            logger.warn('Rejected user API request: missing mTLS DN header');
            res.status(401).json({ error: 'Missing mTLS client certificate' });
            return;
        }

        const parsedDn = parseDistinguishedName(rawDn);
        const cn = parsedDn.CN;
        if (!cn) {
            logger.warn('Rejected user API request: malformed mTLS DN header (no CN)');
            res.status(401).json({ error: 'Invalid mTLS client certificate' });
            return;
        }

        try {
            let user = await findUserByCn(cn);
            if (!user) {
                logger.info(`Auto-registering user CN=${cn}`);
                user = await createUser({ cn });
            }
            req.user = {
                cn: user.cn,
                isAdmin: user.is_admin,
                rmUuid: user.rm_uuid,
                callsign: user.callsign,
            };
            next();
        } catch (error) {
            logger.error(`Database error during user lookup: ${error.message}`);
            res.status(503).json({ error: 'Service temporarily unavailable' });
        }
    };
};

export const mtlsUserMiddleware = createMtlsUserMiddleware();

export { parseDistinguishedName };
