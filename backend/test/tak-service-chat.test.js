import test from 'node:test';
import assert from 'node:assert/strict';

import { createDisabledTakChatSnapshot, TakService } from '../services/tak/takService.js';

function makeFakeClient() {
    const listeners = new Map();
    let sentXml = null;
    let sendThrows = null;
    const client = {
        start() {},
        stop() {},
        sendCot(xml) {
            if (sendThrows) throw sendThrows;
            sentXml = xml;
        },
        on(name, listener) {
            const arr = listeners.get(name) ?? [];
            arr.push(listener);
            listeners.set(name, arr);
        },
        emit(name, payload) {
            for (const l of listeners.get(name) ?? []) l(payload);
        },
        get sentXml() { return sentXml; },
        setSendThrows(error) { sendThrows = error; },
    };
    return client;
}

function makeService(overrides = {}) {
    const client = makeFakeClient();
    const config = { enabled: true, markerTtlSeconds: 600, ...overrides };
    const service = new TakService(config, {
        clientFactory: () => client,
        dbPollerFactory: () => ({ start() {}, stop() {}, on() {} }),
    });
    service.start();
    return { service, client };
}

test('disabled snapshot returns expected shape', () => {
    const snapshot = createDisabledTakChatSnapshot();
    assert.equal(snapshot.enabled, false);
    assert.equal(snapshot.status, 'disabled');
    assert.equal(snapshot.liveOnly, true);
    assert.equal(snapshot.missedWhileDisconnected, false);
    assert.deepEqual(snapshot.messages, []);
});

test('healthy stream chat events append to chat store', () => {
    const { service, client } = makeService();
    client.emit('connected');
    client.emit('chat', {
        id: 'a',
        messageId: 'msg-1',
        roomId: 'all',
        senderCallsign: 'Phone',
        body: 'Hello',
        eventTime: '2026-05-14T10:00:00Z',
        receivedAt: '2026-05-14T10:00:01Z',
        source: 'tak',
    });

    const snapshot = service.getChatSnapshot();
    assert.equal(snapshot.enabled, true);
    assert.equal(snapshot.connected, true);
    assert.equal(snapshot.messageCount, 1);
    assert.equal(snapshot.messages[0].body, 'Hello');
});

test('disconnect/error after healthy connection sets missedWhileDisconnected', () => {
    const { service, client } = makeService();
    client.emit('connected');
    let snapshot = service.getChatSnapshot();
    assert.equal(snapshot.missedWhileDisconnected, false);

    client.emit('disconnected');
    snapshot = service.getChatSnapshot();
    assert.equal(snapshot.missedWhileDisconnected, true);
});

test('publishChatMessage validates input, generates messageId, sends CoT, appends echo', () => {
    const { service, client } = makeService();
    client.emit('connected');
    // ensure writable check on sendCot is set
    client.isWritable = () => true;

    const message = service.publishChatMessage({ senderCallsign: 'BattleLog', body: 'Hi there' });
    assert.ok(message);
    assert.equal(message.body, 'Hi there');
    assert.equal(message.source, 'battlelog');
    assert.equal(message.status, 'sent');
    assert.ok(message.messageId);
    assert.match(client.sentXml ?? '', /type="b-t-f"/);

    const snapshot = service.getChatSnapshot();
    assert.equal(snapshot.messageCount, 1);
});

test('publishChatMessage propagates sendCot failures and appends nothing', () => {
    const { service, client } = makeService();
    client.emit('connected');
    const err = new Error('disconnected');
    err.statusCode = 503;
    client.setSendThrows(err);

    assert.throws(
        () => service.publishChatMessage({ body: 'Hello' }),
        /disconnected/,
    );
    const snapshot = service.getChatSnapshot();
    assert.equal(snapshot.messageCount, 0);
});

test('publishChatMessage rejects when disabled', () => {
    const config = { enabled: false, markerTtlSeconds: 600 };
    const service = new TakService(config, {
        clientFactory: () => makeFakeClient(),
        dbPollerFactory: () => ({ start() {}, stop() {}, on() {} }),
    });

    assert.throws(
        () => service.publishChatMessage({ body: 'Hello' }),
        /disabled/,
    );
});
