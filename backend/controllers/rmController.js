import logger from '../logger.js';
import fs from "fs";
import config from "../config/index.js";


export const checkHealth = async (req, res) => {
    try {
        res.send({"healthy": true});
    } catch (error) {
        logger.error('Error: ' + error.message);
        res.status(500).json({ error: error.message });
    }
};

export const noOp = async (req, res) => {
        res.json({ success: true });
};


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
      return `http://localhost:${config.port}`;
    }
  } else {
    logger.warn('Kraftwerk file not found, using default battlelog URL');
    return `http://localhost:${config.port}`;
  }
}

const BATTLELOG_URL = getBattlelogUrl();

const descriptionBase = {
    shortname: 'battlelog',
    title: 'BattleLog',
    icon: null,
    description: 'Event management and tracking',
    language: 'en',
    component: {
        type: 'link',
        ref: BATTLELOG_URL,
    },
    docs: "https://github.com/pvarki/typescript-liveloki-app/"
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

export const descriptionHandler = async (req, res) => {
    const {language} = req.params;

    const description = descriptions[language];
    if (!description) {
        return res.json(descriptionBase);
    }

    return res.json(description);
};