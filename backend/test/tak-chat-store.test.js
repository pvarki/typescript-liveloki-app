import test from 'node:test';
import assert from 'node:assert/strict';

import { TakChatStore } from '../services/tak/takChatStore.js';

const baseMessage = (overrides = {}) => ({
    id: overrides.id ?? 'm1',
    messageId: overrides.messageId ?? null,
    roomId: 'all',
    senderCallsign: 'Phone',
    body: 'Hello',
    eventTime: '2026-05-14T10:00:00.000Z',
    receivedAt: '2026-05-14T10:00:01.000Z',
    status: 'received',
    source: 'tak',
    ...overrides,
});

test('appends multiple messages from same sender without overwriting', () => {
    const store = new TakChatStore({ now: () => new Date('2026-05-14T10:00:10Z') });
    store.append(baseMessage({ id: 'a', body: 'first' }));
    store.append(baseMessage({ id: 'b', body: 'second', eventTime: '2026-05-14T10:00:02.000Z', receivedAt: '2026-05-14T10:00:03.000Z' }));

    const messages = store.getMessages();
    assert.equal(messages.length, 2);
    assert.equal(messages[0].body, 'first');
    assert.equal(messages[1].body, 'second');
});

test('messages are returned ascending by sortAt', () => {
    const store = new TakChatStore({ now: () => new Date('2026-05-14T10:01:00Z') });
    store.append(baseMessage({ id: 'b', body: 'second', eventTime: '2026-05-14T10:00:30.000Z', receivedAt: '2026-05-14T10:00:31.000Z' }));
    store.append(baseMessage({ id: 'a', body: 'first', eventTime: '2026-05-14T10:00:00.000Z', receivedAt: '2026-05-14T10:00:01.000Z' }));

    const messages = store.getMessages();
    assert.deepEqual(messages.map((m) => m.body), ['first', 'second']);
});

test('equal sortAt tie-breaks by receivedAt then messageId then id', () => {
    const store = new TakChatStore({ now: () => new Date('2026-05-14T10:01:00Z') });
    const sortAt = '2026-05-14T10:00:00.000Z';
    store.append(baseMessage({ id: 'z', messageId: 'zm', body: 'z', eventTime: sortAt, receivedAt: '2026-05-14T10:00:02.000Z' }));
    store.append(baseMessage({ id: 'a', messageId: 'am', body: 'a', eventTime: sortAt, receivedAt: '2026-05-14T10:00:01.000Z' }));
    store.append(baseMessage({ id: 'a2', messageId: 'bm', body: 'a2', eventTime: sortAt, receivedAt: '2026-05-14T10:00:01.000Z' }));

    const messages = store.getMessages();
    assert.deepEqual(messages.map((m) => m.id), ['a', 'a2', 'z']);
});

test('prunes messages older than TTL', () => {
    let nowIso = '2026-05-14T10:00:00.000Z';
    const store = new TakChatStore({ ttlSeconds: 60, now: () => new Date(nowIso) });
    store.append(baseMessage({ id: 'old', body: 'old', eventTime: nowIso, receivedAt: nowIso }));
    nowIso = '2026-05-14T10:02:00.000Z';
    store.append(baseMessage({ id: 'new', body: 'new', eventTime: nowIso, receivedAt: nowIso }));

    const messages = store.getMessages();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, 'new');
});

test('prunes by max message count', () => {
    const store = new TakChatStore({ maxMessages: 3, now: () => new Date('2026-05-14T10:00:10Z') });
    for (let i = 0; i < 5; i += 1) {
        store.append(baseMessage({
            id: `m${i}`,
            body: `m${i}`,
            eventTime: new Date(Date.parse('2026-05-14T10:00:00Z') + i * 1000).toISOString(),
            receivedAt: new Date(Date.parse('2026-05-14T10:00:00Z') + i * 1000).toISOString(),
        }));
    }
    const messages = store.getMessages();
    assert.equal(messages.length, 3);
    assert.deepEqual(messages.map((m) => m.id), ['m2', 'm3', 'm4']);
});

test('dedupes by messageId', () => {
    const store = new TakChatStore({ now: () => new Date('2026-05-14T10:00:10Z') });
    store.append(baseMessage({ id: 'a', messageId: 'msg-1', body: 'one' }));
    store.append(baseMessage({ id: 'b', messageId: 'msg-1', body: 'one' }));
    assert.equal(store.getMessages().length, 1);
});

test('fallback dedupe uses roomId+sender+normalizedBody+sortAt', () => {
    const store = new TakChatStore({ now: () => new Date('2026-05-14T10:00:10Z') });
    store.append(baseMessage({ id: 'a', messageId: null, body: 'Hello', eventTime: '2026-05-14T10:00:00Z' }));
    store.append(baseMessage({ id: 'b', messageId: null, body: '  Hello  ', eventTime: '2026-05-14T10:00:00Z' }));
    assert.equal(store.getMessages().length, 1);
});

test('local echo reconciles with stream echo via messageId', () => {
    const store = new TakChatStore({ now: () => new Date('2026-05-14T10:00:10Z') });
    store.append(baseMessage({
        id: 'local',
        messageId: 'msg-x',
        body: 'hello',
        source: 'battlelog',
        status: 'sent',
        eventTime: '2026-05-14T10:00:00.000Z',
        receivedAt: '2026-05-14T10:00:00.000Z',
    }));
    store.append(baseMessage({
        id: 'remote',
        messageId: 'msg-x',
        body: 'hello',
        source: 'tak',
        status: 'received',
        eventTime: '2026-05-14T10:00:00.000Z',
        receivedAt: '2026-05-14T10:00:02.000Z',
    }));

    const messages = store.getMessages();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, 'local');
    assert.equal(messages[0].status, 'received');
});

test('updates lastEventAt and messageCount on append', () => {
    let now = new Date('2026-05-14T10:00:00Z');
    const store = new TakChatStore({ now: () => now });
    assert.equal(store.lastEventAt, null);

    now = new Date('2026-05-14T10:00:05Z');
    store.append(baseMessage({ id: 'a' }));
    assert.equal(store.lastEventAt, '2026-05-14T10:00:05.000Z');
    assert.equal(store.getMessageCount(), 1);
});
