import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCotChatEvent } from '../services/tak/cotChatBuilder.js';
import { parseCotChat } from '../services/tak/cotChatParser.js';

test('buildCotChatEvent builds escaped default/all chat XML', () => {
    const { message, xml } = buildCotChatEvent(
        { senderCallsign: 'BattleLog <op>', body: 'Hi & welcome' },
        {
            now: () => new Date('2026-05-14T10:00:00Z'),
            uidFactory: () => 'uid-1',
            messageIdFactory: () => 'msg-1',
        },
    );

    assert.equal(message.messageId, 'msg-1');
    assert.equal(message.id, 'msg-1');
    assert.equal(message.roomId, 'all');
    assert.equal(message.status, 'sent');
    assert.equal(message.source, 'battlelog');
    assert.equal(message.body, 'Hi & welcome');
    assert.match(xml, /type="b-t-f"/);
    assert.match(xml, /messageId="msg-1"/);
    assert.match(xml, /chatroom="All Chat Rooms"/);
    assert.match(xml, /senderCallsign="BattleLog &lt;op&gt;"/);
    assert.match(xml, /Hi &amp; welcome/);
});

test('buildCotChatEvent rejects empty body after normalization', () => {
    assert.throws(
        () => buildCotChatEvent({ senderCallsign: 'BattleLog', body: '   ' }),
        /empty after normalization/,
    );
});

test('buildCotChatEvent always generates a messageId before sending', () => {
    const ids = ['msg-a', 'msg-b'];
    const out1 = buildCotChatEvent({ body: 'one' }, { messageIdFactory: () => ids.shift() });
    const out2 = buildCotChatEvent({ body: 'two' }, { messageIdFactory: () => ids.shift() });
    assert.equal(out1.message.messageId, 'msg-a');
    assert.equal(out2.message.messageId, 'msg-b');
});

test('builder output parses back into a valid chat message', () => {
    const { xml } = buildCotChatEvent(
        { senderCallsign: 'BattleLog', body: 'Round-trip' },
        {
            now: () => new Date('2026-05-14T10:00:00Z'),
            uidFactory: () => 'uid-1',
            messageIdFactory: () => 'msg-1',
        },
    );
    const parsed = parseCotChat(xml, { now: () => new Date('2026-05-14T10:00:05Z') });
    assert.ok(parsed);
    assert.equal(parsed.body, 'Round-trip');
    assert.equal(parsed.messageId, 'msg-1');
});
