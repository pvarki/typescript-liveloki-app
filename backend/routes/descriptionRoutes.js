import express from 'express';
import fs from 'fs';
import logger from '../logger.js';
import config from '../config/index.js';


function getBattlelogUrl() {
  const kraftwerkFilePath = '/pvarki/kraftwerk-init.json';
  if (fs.existsSync(kraftwerkFilePath)) {
    try {
      const kraftwerkData = JSON.parse(fs.readFileSync(kraftwerkFilePath, 'utf8'));
      const url =  kraftwerkData.product.uri
      if (!url) throw new Error('Kraftwerk file missing product.uri field');
      return url;
    } catch (error) {
      logger.error('Error reading kraftwerk file:', error);
    }
  } else {
    logger.warn('Kraftwerk file not found, using default battlelog URL');
    return `http://localhost:${config.port}`;
  }
}

const BATTLELOG_URL = getBattlelogUrl();

const router = express.Router();

const descriptionBase = {
    shortname: 'battlelog',
    title: 'Battlelog',
    icon: null,
    description: 'Event management and tracking',
    language: 'en',
    component: {
        type: 'link',
        ref: BATTLELOG_URL,
    },
}

const descriptions = {
    en: descriptionBase,
    fi: {
      ...descriptionBase,
      description: 'Tapahtumien hallinta ja seuranta',
      language: 'fi',
    },
    sv: {
      ...descriptionBase,
      description: 'Händelsehantering och spårning',
      language: 'sv',
    }
};


router.get('/:language', (req, res) => {
    const { language } = req.params;

    const description = descriptions[language];
    if (!description) {
        return res.json(descriptionBase);
    }

    return res.json(description);
});

export default router;
