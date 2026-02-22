import config from '../config/index.js';
import logger from '../logger.js';
import { getManifestProductUri } from '../utils/kraftwerkManifest.js';

const BATTLELOG_DOCS_URL = 'https://github.com/pvarki/typescript-liveloki-app/';
const BATTLELOG_SHORTNAME = 'bl';
const DEFAULT_DESCRIPTION_LANGUAGE = 'en';

const buildFallbackBattlelogUrl = () => `http://localhost:${config.port}`;
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const getBattlelogUrl = () => {
    const productUri = getManifestProductUri();
    if (typeof productUri === 'string' && productUri.trim()) {
        try {
            const url = new URL(productUri);
            if (url.protocol !== 'https:' || url.hostname.startsWith('mtls.') || LOCALHOST_HOSTNAMES.has(url.hostname)) {
                return url.toString();
            }
            url.hostname = `mtls.${url.hostname}`;
            return url.toString();
        } catch (error) {
            logger.warn(`Invalid product URI '${productUri}', using raw value: ${error.message}`);
            return productUri;
        }
    }
    return buildFallbackBattlelogUrl();
};

const BATTLELOG_URL = getBattlelogUrl();

const descriptionBase = {
    shortname: BATTLELOG_SHORTNAME,
    title: 'BattleLog',
    icon: null,
    description: 'Event management and tracking',
    language: DEFAULT_DESCRIPTION_LANGUAGE,
    component: {
        type: 'link',
        ref: BATTLELOG_URL,
    },
    docs: BATTLELOG_DOCS_URL,
};

const descriptions = {
    en: descriptionBase,
    fi: {
        ...descriptionBase,
        description: 'Tapahtumien hallinta ja seuranta',
        language: 'fi',
    },
    sv: {
        ...descriptionBase,
        description: 'Handelsehantering och sparning',
        language: 'sv',
    },
};

const getDescription = (language) => descriptions[language] || descriptions[DEFAULT_DESCRIPTION_LANGUAGE];

const getDescriptionV1 = (language) => {
    const description = getDescription(language);
    return {
        shortname: description.shortname,
        title: description.title,
        icon: description.icon,
        description: description.description,
        language: description.language,
    };
};

const buildInstructions = (language) => {
    const description = getDescription(language);
    return [
        {
            type: 'paragraph',
            body: description.description,
        },
        {
            type: 'link',
            body: BATTLELOG_URL,
        },
    ];
};

export const checkHealth = async (_request, response) => {
    try {
        response.json({ healthy: true, extra: 'Battlelog RM API routes available' });
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        response.status(500).json({ error: error.message });
    }
};

export const noOp = async (_request, response) => {
    response.json({ success: true });
};

export const descriptionV1Handler = async (request, response) => {
    if (!config.mainUiCardVisible) {
        return response.status(404).json({ error: 'Not found' });
    }
    const { language } = request.params;
    return response.json(getDescriptionV1(language));
};
export const descriptionV2Handler = async (request, response) => {
    if (!config.mainUiCardVisible) {
        return response.status(404).json({ error: 'Not found' });
    }
    const { language } = request.params;
    return response.json(getDescription(language));
};

export const descriptionV2AdminHandler = async (request, response) => {
    const { language } = request.params;
    return response.json(getDescription(language));
};

export const instructionsHandler = async (request, response) => {
    const { language } = request.params;
    const { callsign = 'unknown' } = request.body || {};
    const resolvedDescription = getDescription(language);

    return response.json({
        callsign,
        language: resolvedDescription.language,
        instructions: buildInstructions(resolvedDescription.language),
    });
};

export const clientDataHandler = async (_request, response) => {
    return response.json({
        data: {
            url: BATTLELOG_URL,
        },
    });
};

export const adminClientDataHandler = async (_request, response) => {
    return response.json({
        data: {
            url: BATTLELOG_URL,
            admin: true,
        },
    });
};
