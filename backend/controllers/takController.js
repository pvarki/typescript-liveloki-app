import { createDisabledTakChatSnapshot, createDisabledTakSnapshot } from '../services/tak/takService.js';

export const fetchTakMarkers = (req, res) => {
    const service = req.app?.locals?.takService;
    res.json(service?.getSnapshot ? service.getSnapshot() : createDisabledTakSnapshot());
};

export const publishTakMarker = (req, res) => {
    const service = req.app?.locals?.takService;
    if (!service?.publishMarker) {
        res.status(503).json({ error: 'TAK integration is not available' });
        return;
    }

    try {
        const marker = service.publishMarker(req.body ?? {});
        res.status(201).json({ marker });
    } catch (error) {
        res.status(error.statusCode ?? 500).json({ error: error.message });
    }
};

export const fetchTakChat = (req, res) => {
    const service = req.app?.locals?.takService;
    res.json(service?.getChatSnapshot ? service.getChatSnapshot() : createDisabledTakChatSnapshot());
};

export const publishTakChatMessage = (req, res) => {
    const service = req.app?.locals?.takService;
    if (!service?.publishChatMessage) {
        res.status(503).json({ error: 'TAK integration is not available' });
        return;
    }

    try {
        const message = service.publishChatMessage(req.body ?? {});
        res.status(201).json({ message });
    } catch (error) {
        res.status(error.statusCode ?? 500).json({ error: error.message });
    }
};
