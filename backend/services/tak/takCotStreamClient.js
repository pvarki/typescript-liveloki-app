import fs from 'fs';
import net from 'net';
import tls from 'tls';

import { parseCotChat } from './cotChatParser.js';
import { extractCotEvents, parseCotMarker } from './cotMarkerParser.js';

function readOptionalFile(path) {
    return path ? fs.readFileSync(path) : undefined;
}

export class TakCotStreamClient {
    constructor(config, logger = console) {
        this.config = config;
        this.logger = logger;
        this.socket = null;
        this.reconnectTimer = null;
        this.buffer = '';
        this.stopped = true;
        this.connected = false;
        this.listeners = new Map();
    }

    on(eventName, listener) {
        const listeners = this.listeners.get(eventName) ?? [];
        listeners.push(listener);
        this.listeners.set(eventName, listeners);
    }

    emit(eventName, payload) {
        for (const listener of this.listeners.get(eventName) ?? []) {
            listener(payload);
        }
    }

    start() {
        if (this.socket || this.reconnectTimer || !this.stopped) return;
        this.stopped = false;
        this.connect();
    }

    stop() {
        this.stopped = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        if (this.socket) this.socket.destroy();
        this.socket = null;
        this.connected = false;
    }

    connect() {
        if (this.stopped) return;
        let options;
        try {
            options = {
                host: this.config.host,
                port: this.config.port,
            };

            if (this.config.tls) {
                options.servername = this.config.serverName || this.config.host;
                if (this.config.clientCertPath || this.config.clientKeyPath) {
                    options.cert = readOptionalFile(this.config.clientCertPath);
                    options.key = readOptionalFile(this.config.clientKeyPath);
                    options.passphrase = this.config.clientKeyPassword || undefined;
                } else {
                    options.pfx = readOptionalFile(this.config.clientP12Path);
                    options.passphrase = this.config.clientP12Password || undefined;
                }
                options.ca = readOptionalFile(this.config.caPath);
                options.rejectUnauthorized = this.config.rejectUnauthorized;
            }
        } catch (error) {
            this.emit('error', error);
            this.scheduleReconnect();
            return;
        }

        let socket;
        try {
            socket = this.config.tls ? tls.connect(options) : net.connect(options);
        } catch (error) {
            this.emit('error', error);
            this.scheduleReconnect();
            return;
        }
        this.socket = socket;

        socket.on('connect', () => {
            if (!this.config.tls) {
                this.connected = true;
                this.emit('connected');
            }
        });
        socket.on('secureConnect', () => {
            this.connected = true;
            this.emit('connected');
        });
        socket.on('data', (chunk) => this.handleData(chunk));
        socket.on('error', (error) => {
            this.emit('error', error);
        });
        socket.on('close', () => {
            this.socket = null;
            this.connected = false;
            this.emit('disconnected');
            if (!this.stopped) this.scheduleReconnect();
        });
    }

    isWritable() {
        return Boolean(this.socket?.writable && this.connected);
    }

    sendCot(xml) {
        if (!this.isWritable()) {
            const error = new Error('TAK stream is not connected');
            error.statusCode = 503;
            throw error;
        }
        this.socket.write(`${xml}\n`);
    }

    handleData(chunk) {
        this.buffer += chunk.toString('utf8');
        const { events, remaining } = extractCotEvents(this.buffer);
        this.buffer = remaining;
        for (const eventXml of events) {
            const marker = parseCotMarker(eventXml);
            if (marker) this.emit('marker', marker);
            const chat = parseCotChat(eventXml);
            if (chat) this.emit('chat', chat);
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer || this.stopped) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.config.reconnectMs);
    }
}

export function createTakCotStreamClient(config, logger) {
    return new TakCotStreamClient(config, logger);
}
