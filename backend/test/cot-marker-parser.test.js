import test from 'node:test';
import assert from 'node:assert/strict';

import { extractCotEvents, parseCotDatabaseRow, parseCotMarker } from '../services/tak/cotMarkerParser.js';

test('parseCotMarker maps CoT point events to TAK markers', () => {
    const marker = parseCotMarker(`
      <event version="2.0" uid="ANDROID-1" type="a-f-G-U-C" time="2026-05-13T12:00:00Z" stale="2026-05-13T12:10:00Z">
        <point lat="60.45" lon="22.24" hae="12" ce="10" le="10" />
        <detail><contact callsign="Phone One" /></detail>
      </event>
    `);

    assert.deepEqual(marker, {
        uid: 'ANDROID-1',
        type: 'a-f-G-U-C',
        callsign: 'Phone One',
        lat: 60.45,
        lng: 22.24,
        hae: 12,
        time: '2026-05-13T12:00:00Z',
        stale: '2026-05-13T12:10:00Z',
    });
});

test('parseCotMarker rejects invalid point events', () => {
    assert.equal(parseCotMarker('<event uid="x"><point lat="bad" lon="22" /></event>'), null);
    assert.equal(parseCotMarker('<event><point lat="60" lon="22" /></event>'), null);
    assert.equal(parseCotMarker('<event uid="probe" type="t-x-takp-v"><point lat="0" lon="0" /></event>'), null);
});

test('extractCotEvents returns complete events and keeps partial buffer', () => {
    const { events, remaining } = extractCotEvents('<event uid="1"></event><event uid="2">');

    assert.equal(events.length, 1);
    assert.equal(events[0], '<event uid="1"></event>');
    assert.equal(remaining, '<event uid="2">');
});

test('parseCotDatabaseRow maps persisted TAK cot_router rows to markers', () => {
    const marker = parseCotDatabaseRow({
        uid: 'marker-1',
        type: 'a-n-G',
        lat: '61.5',
        lng: '24.5',
        hae: '100.25',
        time: new Date('2026-05-14T10:00:00Z'),
        stale: new Date('2027-05-14T10:00:00Z'),
        detail: '<detail><contact callsign="N.14.1000"/><remarks>fallback</remarks></detail>',
    });

    assert.deepEqual(marker, {
        uid: 'marker-1',
        type: 'a-n-G',
        callsign: 'N.14.1000',
        lat: 61.5,
        lng: 24.5,
        hae: 100.25,
        time: '2026-05-14T10:00:00.000Z',
        stale: '2027-05-14T10:00:00.000Z',
    });
});
