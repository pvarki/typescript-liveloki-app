import { randomUUID } from 'node:crypto';

import { normalizeChatBody } from './cotChatParser.js';

const DEFAULT_STALE_SECONDS = 60;
const ALL_ROOM_ID = 'All Chat Rooms';
const ALL_ROOM_GROUP_OWNER = 'true';
const CHAT_TYPE = 'b-t-f';

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function readCallsign(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 80) : fallback;
}

export function buildCotChatEvent(input, {
    now = () => new Date(),
    uidFactory = () => `BattleLog-${randomUUID()}`,
    messageIdFactory = () => `BattleLog-msg-${randomUUID()}`,
    staleSeconds = DEFAULT_STALE_SECONDS,
} = {}) {
    const senderCallsign = readCallsign(input?.senderCallsign, 'BattleLog');
    const body = normalizeChatBody(input?.body);
    if (!body) {
        const error = new Error('TAK chat message body is empty after normalization');
        error.statusCode = 400;
        throw error;
    }

    const uid = `GeoChat.${uidFactory()}`;
    const messageId = String(input?.messageId || messageIdFactory());
    const createdAt = now();
    const time = createdAt.toISOString();
    const stale = new Date(createdAt.getTime() + staleSeconds * 1000).toISOString();

    const senderEscaped = escapeXml(senderCallsign);
    const roomEscaped = escapeXml(ALL_ROOM_ID);
    const messageIdEscaped = escapeXml(messageId);
    const bodyEscaped = escapeXml(body);

    const xml = [
        `<event version="2.0" uid="${escapeXml(uid)}" type="${CHAT_TYPE}" how="h-g-i-g-o" time="${time}" start="${time}" stale="${stale}">`,
        '<point lat="0" lon="0" hae="9999999" ce="9999999" le="9999999"/>',
        '<detail>',
        `<__chat parent="RootContactGroup" groupOwner="${ALL_ROOM_GROUP_OWNER}" messageId="${messageIdEscaped}" chatroom="${roomEscaped}" id="${roomEscaped}" senderCallsign="${senderEscaped}">`,
        `<chatgrp id="${roomEscaped}" uid0="${senderEscaped}"/>`,
        '</__chat>',
        `<link uid="${senderEscaped}" type="a-f-G" relation="p-p"/>`,
        `<remarks source="BAO.F.BattleLog.${senderEscaped}" to="${roomEscaped}" time="${time}">${bodyEscaped}</remarks>`,
        '</detail>',
        '</event>',
    ].join('');

    const message = {
        id: messageId,
        messageId,
        roomId: 'all',
        senderCallsign,
        body,
        eventTime: time,
        receivedAt: time,
        status: 'sent',
        source: 'battlelog',
    };

    return { message, xml };
}
