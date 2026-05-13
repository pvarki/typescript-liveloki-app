import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCotMarkerEvent } from '../services/tak/cotMarkerBuilder.js';

test('buildCotMarkerEvent creates escaped TAK point event XML', () => {
    const { marker, xml } = buildCotMarkerEvent(
        {
            callsign: 'BattleLog <one>',
            lat: 61.5,
            lng: 24.5,
            remarks: 'From BattleLog & TAK',
        },
        {
            now: () => new Date('2026-05-14T10:00:00Z'),
            uidFactory: () => 'BattleLog-test',
            staleSeconds: 60,
        },
    );

    assert.deepEqual(marker, {
        uid: 'BattleLog-test',
        type: 'a-n-G',
        callsign: 'BattleLog <one>',
        lat: 61.5,
        lng: 24.5,
        hae: 0,
        time: '2026-05-14T10:00:00.000Z',
        stale: '2026-05-14T10:01:00.000Z',
    });
    assert.match(xml, /<event version="2.0" uid="BattleLog-test" type="a-n-G"/);
    assert.match(xml, /<point lat="61.5" lon="24.5"/);
    assert.match(xml, /callsign="BattleLog &lt;one&gt;"/);
    assert.match(xml, /From BattleLog &amp; TAK/);
});

test('buildCotMarkerEvent rejects invalid coordinates', () => {
    assert.throws(
        () => buildCotMarkerEvent({ callsign: 'Bad', lat: 120, lng: 24 }),
        /valid lat and lng/,
    );
});
