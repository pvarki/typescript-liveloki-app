import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchTakMarkers, publishTakMarker } from '../controllers/takController.js';

test('fetchTakMarkers returns disabled snapshot when service is absent', () => {
    let payload = null;
    fetchTakMarkers({ app: { locals: {} } }, { json: (body) => { payload = body; } });

    assert.equal(payload.enabled, false);
    assert.equal(payload.connected, false);
    assert.equal(payload.status, 'disabled');
    assert.deepEqual(payload.markers, []);
});

test('fetchTakMarkers returns service snapshot without event persistence dependency', () => {
    const snapshot = {
        enabled: true,
        connected: true,
        status: 'connected',
        lastEventAt: '2026-05-13T12:00:00.000Z',
        lastError: null,
        markerCount: 1,
        markers: [{ uid: 'alpha', lat: 60, lng: 24, callsign: 'A' }],
    };
    let payload = null;
    fetchTakMarkers(
        { app: { locals: { takService: { getSnapshot: () => snapshot } } } },
        { json: (body) => { payload = body; } }
    );

    assert.equal(payload, snapshot);
    assert.equal(payload.markerCount, 1);
});

test('publishTakMarker publishes marker through TAK service', () => {
    const marker = { uid: 'BattleLog-test', lat: 60, lng: 24, callsign: 'Test' };
    let statusCode = null;
    let payload = null;
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            payload = body;
        },
    };

    publishTakMarker(
        {
            body: { lat: 60, lng: 24, callsign: 'Test' },
            app: { locals: { takService: { publishMarker: () => marker } } },
        },
        res,
    );

    assert.equal(statusCode, 201);
    assert.deepEqual(payload, { marker });
});

test('publishTakMarker reports validation errors', () => {
    let statusCode = null;
    let payload = null;
    const error = new Error('bad marker');
    error.statusCode = 400;
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            payload = body;
        },
    };

    publishTakMarker(
        {
            body: { lat: 120, lng: 24 },
            app: { locals: { takService: { publishMarker: () => { throw error; } } } },
        },
        res,
    );

    assert.equal(statusCode, 400);
    assert.deepEqual(payload, { error: 'bad marker' });
});
