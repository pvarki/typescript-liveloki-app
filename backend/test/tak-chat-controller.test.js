import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchTakChat, publishTakChatMessage } from '../controllers/takController.js';

function makeRes() {
    let statusCode = 200;
    let payload = null;
    return {
        status(code) { statusCode = code; return this; },
        json(body) { payload = body; },
        get statusCode() { return statusCode; },
        get payload() { return payload; },
    };
}

test('fetchTakChat returns disabled snapshot when service absent', () => {
    const res = makeRes();
    fetchTakChat({ app: { locals: {} } }, res);
    assert.equal(res.payload.enabled, false);
    assert.equal(res.payload.status, 'disabled');
    assert.equal(res.payload.liveOnly, true);
    assert.deepEqual(res.payload.messages, []);
});

test('fetchTakChat delegates to service snapshot', () => {
    const snapshot = {
        enabled: true,
        connected: true,
        status: 'connected',
        lastEventAt: null,
        lastError: null,
        liveOnly: true,
        missedWhileDisconnected: false,
        messageCount: 0,
        messages: [],
    };
    const res = makeRes();
    fetchTakChat({ app: { locals: { takService: { getChatSnapshot: () => snapshot } } } }, res);
    assert.equal(res.payload, snapshot);
});

test('publishTakChatMessage returns 201 with message on success', () => {
    const message = {
        id: 'msg-1',
        messageId: 'msg-1',
        roomId: 'all',
        senderCallsign: 'BattleLog',
        body: 'hello',
        eventTime: null,
        receivedAt: '2026-05-14T10:00:00Z',
        status: 'sent',
        source: 'battlelog',
    };
    const res = makeRes();
    publishTakChatMessage(
        {
            body: { body: 'hello' },
            app: { locals: { takService: { publishChatMessage: () => message } } },
        },
        res,
    );
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.payload, { message });
});

test('publishTakChatMessage returns service error status', () => {
    const error = new Error('TAK stream is not connected');
    error.statusCode = 503;
    const res = makeRes();
    publishTakChatMessage(
        {
            body: { body: 'hello' },
            app: { locals: { takService: { publishChatMessage: () => { throw error; } } } },
        },
        res,
    );
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.payload, { error: 'TAK stream is not connected' });
});

test('publishTakChatMessage reports unavailable when no service', () => {
    const res = makeRes();
    publishTakChatMessage({ body: { body: 'hello' }, app: { locals: {} } }, res);
    assert.equal(res.statusCode, 503);
    assert.match(res.payload.error, /not available/);
});
