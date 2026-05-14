import test from 'node:test';
import assert from 'node:assert/strict';

import { TakCotStreamClient } from '../services/tak/takCotStreamClient.js';

function makeClient() {
    const client = new TakCotStreamClient({ host: 'x', port: 1, tls: false });
    const captured = { marker: [], chat: [] };
    client.on('marker', (m) => captured.marker.push(m));
    client.on('chat', (m) => captured.chat.push(m));
    return { client, captured };
}

test('handleData emits markers as before', () => {
    const { client, captured } = makeClient();
    const xml = `<event version="2.0" uid="A1" type="a-f-G-U-C" time="2026-05-14T10:00:00Z" stale="2026-05-14T10:10:00Z">
        <point lat="60" lon="22"/>
        <detail><contact callsign="Phone"/></detail>
        </event>`;
    client.handleData(Buffer.from(xml, 'utf8'));
    assert.equal(captured.marker.length, 1);
    assert.equal(captured.chat.length, 0);
});

test('handleData emits chat when parser matches', () => {
    const { client, captured } = makeClient();
    const xml = `<event version="2.0" uid="GeoChat.A.1" type="b-t-f" time="2026-05-14T10:00:00Z" stale="2026-05-14T10:05:00Z">
        <point lat="0" lon="0"/>
        <detail>
        <__chat parent="RootContactGroup" groupOwner="true" messageId="m1" chatroom="All Chat Rooms" id="All Chat Rooms" senderCallsign="Phone">
        <chatgrp id="All Chat Rooms" uid0="Phone"/>
        </__chat>
        <remarks source="x" to="All Chat Rooms" time="2026-05-14T10:00:00Z">hello</remarks>
        </detail>
        </event>`;
    client.handleData(Buffer.from(xml, 'utf8'));
    assert.equal(captured.chat.length, 1);
    assert.equal(captured.chat[0].body, 'hello');
});

test('handleData buffers split CoT events across chunks', () => {
    const { client, captured } = makeClient();
    const full = `<event version="2.0" uid="A1" type="a-f-G-U-C" time="2026-05-14T10:00:00Z" stale="2026-05-14T10:10:00Z">
        <point lat="60" lon="22"/><detail><contact callsign="Phone"/></detail></event>`;
    const half = Math.floor(full.length / 2);
    client.handleData(Buffer.from(full.slice(0, half), 'utf8'));
    assert.equal(captured.marker.length, 0);
    client.handleData(Buffer.from(full.slice(half), 'utf8'));
    assert.equal(captured.marker.length, 1);
});
