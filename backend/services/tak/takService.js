import fs from 'node:fs';

import { createTakCotStreamClient } from './takCotStreamClient.js';
import { createTakCotDatabasePoller } from './takCotDatabasePoller.js';
import { buildCotChatEvent } from './cotChatBuilder.js';
import { buildCotMarkerEvent } from './cotMarkerBuilder.js';
import { createTakChatStore } from './takChatStore.js';
import { createTakMarkerStore } from './takMarkerStore.js';

export const TAK_STATUS = Object.freeze({
    DISABLED: 'disabled',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
});

function describeMissingCertPaths(config) {
    if (!config.tls) return [];
    const paths = [];
    const usingPem = config.clientCertPath || config.clientKeyPath;
    if (usingPem) {
        if (config.clientCertPath) paths.push(['TAK_CLIENT_CERT_PATH', config.clientCertPath]);
        if (config.clientKeyPath) paths.push(['TAK_CLIENT_KEY_PATH', config.clientKeyPath]);
    } else if (config.clientP12Path) {
        paths.push(['TAK_CLIENT_P12_PATH', config.clientP12Path]);
    }
    if (config.caPath) paths.push(['TAK_CA_PATH', config.caPath]);
    return paths.filter(([, path]) => path && !fs.existsSync(path));
}

function createDbPollConfig(config) {
    if (!config.dbPoll?.enabled) return null;
    const base = {
        pollMs: config.dbPoll.pollMs,
        queryLimit: config.dbPoll.queryLimit,
        max: 1,
    };
    if (config.dbPoll.connectionString) {
        return { ...base, connectionString: config.dbPoll.connectionString };
    }
    return {
        ...base,
        host: config.dbPoll.host,
        port: config.dbPoll.port,
        database: config.dbPoll.database,
        user: config.dbPoll.user,
        password: config.dbPoll.password,
    };
}

export class TakService {
    constructor(
        config,
        {
            logger = console,
            clientFactory = createTakCotStreamClient,
            dbPollerFactory = createTakCotDatabasePoller,
            store = null,
            chatStore = null,
        } = {},
    ) {
        this.config = config;
        this.logger = logger;
        this.clientFactory = clientFactory;
        this.dbPollerFactory = dbPollerFactory;
        this.store = store ?? createTakMarkerStore({ ttlSeconds: config.markerTtlSeconds });
        this.chatStore = chatStore ?? createTakChatStore();
        this.client = null;
        this.dbPoller = null;
        this.status = config.enabled ? TAK_STATUS.DISCONNECTED : TAK_STATUS.DISABLED;
        this.lastError = null;
        this.lastDbPollAt = null;
        this.lastDbPollError = null;
        this.hasBeenHealthy = false;
        this.missedWhileDisconnected = false;
    }

    start() {
        if (!this.config.enabled || this.client) return;
        const missing = describeMissingCertPaths(this.config);
        if (missing.length > 0) {
            const descriptions = missing.map(([name, path]) => `${name}=${path}`).join(', ');
            this.logger.warn?.(
                `TAK enabled but cert/key files are missing: ${descriptions}. Connection attempts will fail until these paths exist.`,
            );
        }
        this.status = TAK_STATUS.CONNECTING;
        this.client = this.clientFactory(this.config, this.logger);
        this.client.on('connected', () => {
            this.status = TAK_STATUS.CONNECTED;
            this.lastError = null;
            this.hasBeenHealthy = true;
        });
        this.client.on('disconnected', () => {
            if (this.status !== TAK_STATUS.ERROR) this.status = TAK_STATUS.DISCONNECTED;
            if (this.hasBeenHealthy) this.missedWhileDisconnected = true;
        });
        this.client.on('error', (error) => {
            this.status = TAK_STATUS.ERROR;
            this.lastError = error.message;
            if (this.hasBeenHealthy) this.missedWhileDisconnected = true;
            this.logger.warn?.(`TAK stream error: ${error.message}`);
        });
        this.client.on('marker', (marker) => {
            this.store.upsert(marker);
        });
        this.client.on('chat', (chat) => {
            this.chatStore.append(chat);
        });
        this.client.start();

        const dbPollConfig = createDbPollConfig(this.config);
        if (dbPollConfig) {
            this.dbPoller = this.dbPollerFactory(dbPollConfig, this.logger);
            this.dbPoller.on('marker', (marker) => {
                this.store.upsert(marker);
            });
            this.dbPoller.on('polled', () => {
                this.lastDbPollAt = new Date().toISOString();
                this.lastDbPollError = null;
            });
            this.dbPoller.on('error', (error) => {
                this.lastDbPollError = error.message;
                this.logger.warn?.(`TAK database poll error: ${error.message}`);
            });
            this.dbPoller.start();
        }
    }

    stop() {
        this.client?.stop();
        this.client = null;
        this.dbPoller?.stop();
        this.dbPoller = null;
        this.status = this.config.enabled ? TAK_STATUS.DISCONNECTED : TAK_STATUS.DISABLED;
    }

    getSnapshot() {
        const markers = this.store.getMarkers();
        return {
            enabled: Boolean(this.config.enabled),
            connected: this.status === TAK_STATUS.CONNECTED,
            status: this.status,
            lastEventAt: this.store.lastEventAt,
            lastError: this.lastError,
            dbPollEnabled: Boolean(this.config.dbPoll?.enabled),
            lastDbPollAt: this.lastDbPollAt,
            lastDbPollError: this.lastDbPollError,
            markerCount: markers.length,
            markers,
        };
    }

    getChatSnapshot() {
        const messages = this.chatStore.getMessages();
        return {
            enabled: Boolean(this.config.enabled),
            connected: this.status === TAK_STATUS.CONNECTED,
            status: this.status,
            lastEventAt: this.chatStore.lastEventAt,
            lastError: this.lastError,
            liveOnly: true,
            missedWhileDisconnected: this.missedWhileDisconnected,
            messageCount: messages.length,
            messages,
        };
    }

    publishChatMessage(input) {
        if (!this.config.enabled) {
            const error = new Error('TAK integration is disabled');
            error.statusCode = 503;
            throw error;
        }
        if (!this.client?.sendCot) {
            const error = new Error('TAK stream is not available');
            error.statusCode = 503;
            throw error;
        }

        const { message, xml } = buildCotChatEvent(input ?? {});
        this.client.sendCot(xml);
        const stored = this.chatStore.append(message);
        return stored ?? message;
    }

    publishMarker(input) {
        if (!this.config.enabled) {
            const error = new Error('TAK integration is disabled');
            error.statusCode = 503;
            throw error;
        }
        if (!this.client?.sendCot) {
            const error = new Error('TAK stream is not available');
            error.statusCode = 503;
            throw error;
        }

        const { marker, xml } = buildCotMarkerEvent(input, {
            staleSeconds: this.config.publishStaleSeconds,
        });
        this.client.sendCot(xml);
        this.store.upsert(marker);
        return marker;
    }
}

export function createDisabledTakSnapshot() {
    return {
        enabled: false,
        connected: false,
        status: TAK_STATUS.DISABLED,
        lastEventAt: null,
        lastError: null,
        dbPollEnabled: false,
        lastDbPollAt: null,
        lastDbPollError: null,
        markerCount: 0,
        markers: [],
    };
}

export function createDisabledTakChatSnapshot() {
    return {
        enabled: false,
        connected: false,
        status: TAK_STATUS.DISABLED,
        lastEventAt: null,
        lastError: null,
        liveOnly: true,
        missedWhileDisconnected: false,
        messageCount: 0,
        messages: [],
    };
}

export function createTakService(config, options) {
    return new TakService(config, options);
}
