import test from 'node:test';
import assert from 'node:assert/strict';

import { TakMarkerStore } from '../services/tak/takMarkerStore.js';

test('TakMarkerStore stores and updates markers by UID', () => {
    const now = new Date('2026-05-13T12:00:00.000Z');
    const store = new TakMarkerStore({ now: () => now });

    store.upsert({ uid: 'alpha', lat: 60, lng: 24, callsign: 'A' });
    store.upsert({ uid: 'alpha', lat: 61, lng: 25, callsign: 'A2' });

    const markers = store.getMarkers();
    assert.equal(markers.length, 1);
    assert.equal(markers[0].lat, 61);
    assert.equal(markers[0].callsign, 'A2');
});

test('TakMarkerStore rejects missing UID and invalid coordinates', () => {
    const store = new TakMarkerStore();

    assert.equal(store.upsert({ lat: 60, lng: 24 }), null);
    assert.equal(store.upsert({ uid: 'bad', lat: Number.NaN, lng: 24 }), null);
    assert.deepEqual(store.getMarkers(), []);
});

test('TakMarkerStore prunes stale markers', () => {
    let current = new Date('2026-05-13T12:00:00.000Z');
    const store = new TakMarkerStore({ now: () => current, ttlSeconds: 1 });

    store.upsert({ uid: 'alpha', lat: 60, lng: 24 });
    assert.equal(store.getMarkerCount(), 1);

    current = new Date('2026-05-13T12:00:02.000Z');
    assert.equal(store.getMarkerCount(), 0);
});
