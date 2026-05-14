const ATTR_PATTERN = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(["'])(.*?)\2/gms;

const MAX_BODY_CODE_POINTS = 500;
const ALL_ROOM_IDS = new Set(['all chat rooms', 'all-chat-rooms', 'all', 'allchatrooms', '__chat', 'allchat']);
const CHAT_TYPE_PREFIX = 'b-t-f';

function stripUnsafeControls(value) {
    let out = '';
    for (const ch of value) {
        const code = ch.codePointAt(0) ?? 0;
        const isAllowed = code === 9 || code === 10
            || (code >= 32 && code !== 127);
        if (isAllowed) out += ch;
    }
    return out;
}

function parseAttributes(fragment) {
    const attrs = {};
    for (const match of fragment.matchAll(ATTR_PATTERN)) {
        attrs[match[1]] = match[3];
    }
    return attrs;
}

function firstTag(xml, tagName) {
    const pattern = new RegExp(`<${tagName}\\b([^>]*)>`, 'im');
    return xml.match(pattern)?.[1] ?? null;
}

function unescapeXml(value) {
    return String(value)
        .replaceAll('&apos;', "'")
        .replaceAll('&quot;', '"')
        .replaceAll('&gt;', '>')
        .replaceAll('&lt;', '<')
        .replaceAll('&amp;', '&');
}

function countCodePoints(value) {
    let count = 0;
    // eslint-disable-next-line no-unused-vars
    for (const ch of value) count += 1;
    return count;
}

function truncateCodePoints(value, max) {
    if (countCodePoints(value) <= max) return value;
    let out = '';
    let count = 0;
    for (const ch of value) {
        if (count >= max) break;
        out += ch;
        count += 1;
    }
    return out;
}

export function normalizeChatBody(input) {
    if (input === undefined || input === null) return '';
    let body = String(input);
    body = body.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    body = stripUnsafeControls(body);
    body = body.trim();
    const lines = body.split('\n').map((line) => line.replaceAll(/[ \t]+/g, ' ').trim());
    body = lines.join('\n');
    body = truncateCodePoints(body, MAX_BODY_CODE_POINTS);
    return body;
}

function isChatType(type) {
    if (typeof type !== 'string') return false;
    return type === CHAT_TYPE_PREFIX || type.startsWith(`${CHAT_TYPE_PREFIX}-`) || type.startsWith(`${CHAT_TYPE_PREFIX}.`);
}

function normalizeRoomKey(value) {
    return String(value ?? '').trim().toLowerCase();
}

function isAllRoom(roomId, chatroom) {
    const roomIdLower = normalizeRoomKey(roomId);
    const chatroomLower = normalizeRoomKey(chatroom);
    if (roomIdLower && ALL_ROOM_IDS.has(roomIdLower)) return true;
    if (chatroomLower && ALL_ROOM_IDS.has(chatroomLower)) return true;
    return false;
}

export function parseCotChat(xml, { now = () => new Date(), idFactory } = {}) {
    if (typeof xml !== 'string' || !xml.includes('<event')) return null;

    const eventAttrs = parseAttributes(firstTag(xml, 'event') ?? '');
    if (!eventAttrs.type || !isChatType(eventAttrs.type)) return null;

    const chatAttrs = parseAttributes(firstTag(xml, '__chat') ?? '');
    if (!chatAttrs.chatroom && !chatAttrs.id && !chatAttrs.groupOwner) return null;

    const roomId = chatAttrs.id || chatAttrs.chatroom;
    if (!isAllRoom(roomId, chatAttrs.chatroom)) return null;

    const remarksMatch = xml.match(/<remarks\b([^>]*)>([\s\S]*?)<\/remarks>/im);
    const remarksAttrs = parseAttributes(remarksMatch?.[1] ?? '');
    const rawBody = remarksMatch?.[2] ?? '';
    const body = normalizeChatBody(unescapeXml(rawBody));
    if (!body) return null;

    const senderCallsign = chatAttrs.senderCallsign || chatAttrs.chatroom || remarksAttrs.source || eventAttrs.uid || 'unknown';

    const messageId = chatAttrs.messageId || remarksAttrs.messageId || null;
    const eventTime = eventAttrs.time || null;
    const receivedAt = now().toISOString();
    const id = messageId
        || (typeof idFactory === 'function' ? idFactory() : `tak-${eventAttrs.uid ?? receivedAt}-${receivedAt}`);

    return {
        id: String(id),
        messageId: messageId ? String(messageId) : null,
        roomId: 'all',
        senderCallsign: String(senderCallsign),
        body,
        eventTime,
        receivedAt,
        status: 'received',
        source: 'tak',
    };
}

export const CHAT_BODY_MAX_CODE_POINTS = MAX_BODY_CODE_POINTS;
