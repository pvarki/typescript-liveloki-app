import { randomUUID } from 'node:crypto';

const DEFAULT_STALE_SECONDS = 365 * 24 * 60 * 60;
const DEFAULT_TYPE = 'a-n-G';
const DEFAULT_HOW = 'h-g-i-g-o';

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function readCoordinate(value, min, max) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function readOptionalNumber(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function readLabel(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 80) : fallback;
}

export function buildCotMarkerEvent(input, {
    now = () => new Date(),
    uidFactory = () => `BattleLog-${randomUUID()}`,
    staleSeconds = DEFAULT_STALE_SECONDS,
} = {}) {
    const lat = readCoordinate(input?.lat, -90, 90);
    const lng = readCoordinate(input?.lng, -180, 180);
    if (lat === null || lng === null) {
        const error = new Error('TAK marker requires valid lat and lng');
        error.statusCode = 400;
        throw error;
    }

    const uid = readLabel(input.uid, uidFactory());
    const callsign = readLabel(input.callsign, 'BattleLog marker');
    const type = readLabel(input.type, DEFAULT_TYPE);
    const hae = readOptionalNumber(input.hae, 0);
    const ce = readOptionalNumber(input.ce, 9_999_999);
    const le = readOptionalNumber(input.le, 9_999_999);
    const createdAt = now();
    const time = createdAt.toISOString();
    const stale = new Date(createdAt.getTime() + staleSeconds * 1000).toISOString();
    const remarks = readLabel(input.remarks, 'Created from BattleLog');

    const xml = [
        `<event version="2.0" uid="${escapeXml(uid)}" type="${escapeXml(type)}" how="${DEFAULT_HOW}" time="${time}" start="${time}" stale="${stale}">`,
        `<point lat="${lat}" lon="${lng}" hae="${hae}" ce="${ce}" le="${le}"/>`,
        '<detail>',
        `<contact callsign="${escapeXml(callsign)}"/>`,
        `<remarks>${escapeXml(remarks)}</remarks>`,
        '<archive/>',
        '</detail>',
        '</event>',
    ].join('');

    return {
        marker: {
            uid,
            type,
            callsign,
            lat,
            lng,
            hae,
            time,
            stale,
        },
        xml,
    };
}
