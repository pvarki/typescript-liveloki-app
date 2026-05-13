const ATTR_PATTERN = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(["'])(.*?)\2/gms;

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

function readNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function readDateValue(value) {
    return value instanceof Date ? value.toISOString() : value;
}

function isDisplayMarkerType(type) {
    return typeof type === 'string' && type.startsWith('a-');
}

export function parseCotMarker(xml) {
    if (typeof xml !== 'string' || !xml.includes('<event')) return null;

    const eventAttrs = parseAttributes(firstTag(xml, 'event') ?? '');
    const pointAttrs = parseAttributes(firstTag(xml, 'point') ?? '');
    const contactAttrs = parseAttributes(firstTag(xml, 'contact') ?? '');
    const remarks = xml.match(/<remarks\b[^>]*>(.*?)<\/remarks>/ims)?.[1]?.trim();

    const lat = readNumber(pointAttrs.lat);
    const lng = readNumber(pointAttrs.lon ?? pointAttrs.lng);
    if (!eventAttrs.uid || lat === null || lng === null) return null;
    if (!isDisplayMarkerType(eventAttrs.type)) return null;

    return {
        uid: eventAttrs.uid,
        type: eventAttrs.type ?? '',
        callsign: contactAttrs.callsign ?? contactAttrs.name ?? remarks ?? eventAttrs.uid,
        lat,
        lng,
        hae: readNumber(pointAttrs.hae),
        time: eventAttrs.time ?? null,
        stale: eventAttrs.stale ?? null,
    };
}

export function parseCotDatabaseRow(row) {
    if (!row || typeof row !== 'object') return null;

    const lat = readNumber(row.lat);
    const lng = readNumber(row.lng);
    if (!row.uid || lat === null || lng === null) return null;
    if (!isDisplayMarkerType(row.type)) return null;

    const contactAttrs = parseAttributes(firstTag(row.detail ?? '', 'contact') ?? '');
    const remarks = String(row.detail ?? '').match(/<remarks\b[^>]*>(.*?)<\/remarks>/ims)?.[1]?.trim();

    return {
        uid: String(row.uid),
        type: row.type ? String(row.type) : '',
        callsign: contactAttrs.callsign ?? contactAttrs.name ?? remarks ?? String(row.uid),
        lat,
        lng,
        hae: readNumber(row.hae),
        time: readDateValue(row.time) ?? null,
        stale: readDateValue(row.stale) ?? null,
    };
}

export function extractCotEvents(buffer) {
    const events = [];
    let remaining = String(buffer ?? '');
    let endIndex = remaining.indexOf('</event>');

    while (endIndex !== -1) {
        const eventEnd = endIndex + '</event>'.length;
        const startIndex = remaining.lastIndexOf('<event', endIndex);
        if (startIndex === -1) {
            remaining = remaining.slice(eventEnd);
        } else {
            events.push(remaining.slice(startIndex, eventEnd));
            remaining = remaining.slice(eventEnd);
        }
        endIndex = remaining.indexOf('</event>');
    }

    return { events, remaining };
}
