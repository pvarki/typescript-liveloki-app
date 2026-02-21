import fs from 'node:fs';

import logger from '../logger.js';

const KRAFTWERK_FILE_PATH = '/pvarki/kraftwerk-init.json';

export const readKraftwerkManifest = () => {
    if (!fs.existsSync(KRAFTWERK_FILE_PATH)) {
        logger.warn('Kraftwerk file not found');
        return null;
    }

    try {
        const rawManifest = fs.readFileSync(KRAFTWERK_FILE_PATH, 'utf8');
        return JSON.parse(rawManifest);
    } catch (error) {
        logger.error(`Error reading kraftwerk file: ${error.message}`);
        return null;
    }
};

const readManifestString = (extractor) => {
    const manifest = readKraftwerkManifest();
    if (!manifest) {
        return null;
    }

    const value = extractor(manifest);
    if (typeof value !== 'string' || !value.trim()) {
        return null;
    }

    return value.trim();
};

export const getManifestProductUri = () => readManifestString((manifest) => manifest?.product?.uri);

export const getManifestRmCertCn = () => readManifestString((manifest) => manifest?.rasenmaeher?.certcn);
