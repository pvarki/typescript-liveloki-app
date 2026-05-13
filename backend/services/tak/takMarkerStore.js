const DEFAULT_TTL_SECONDS = 600;

const toIsoString = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeMarker = (marker, now = new Date(), ttlSeconds = DEFAULT_TTL_SECONDS) => {
    const lat = Number(marker.lat);
    const lng = Number(marker.lng);
    if (!marker.uid || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    const time = toIsoString(marker.time) ?? now.toISOString();
    const stale = toIsoString(marker.stale) ?? new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    return {
        uid: String(marker.uid),
        type: marker.type ? String(marker.type) : '',
        callsign: marker.callsign ? String(marker.callsign) : String(marker.uid),
        lat,
        lng,
        hae: marker.hae === undefined || marker.hae === null ? null : Number(marker.hae),
        time,
        stale,
    };
};

export class TakMarkerStore {
    constructor({ ttlSeconds = DEFAULT_TTL_SECONDS, now = () => new Date() } = {}) {
        this.ttlSeconds = ttlSeconds;
        this.now = now;
        this.markers = new Map();
        this.lastEventAt = null;
    }

    upsert(marker) {
        const normalized = normalizeMarker(marker, this.now(), this.ttlSeconds);
        if (!normalized) return null;
        this.markers.set(normalized.uid, normalized);
        this.lastEventAt = this.now().toISOString();
        return normalized;
    }

    pruneExpired() {
        const nowMs = this.now().getTime();
        for (const [uid, marker] of this.markers.entries()) {
            const staleMs = new Date(marker.stale).getTime();
            if (Number.isFinite(staleMs) && staleMs < nowMs) {
                this.markers.delete(uid);
            }
        }
    }

    getMarkers() {
        this.pruneExpired();
        return [...this.markers.values()].toSorted((a, b) => a.uid.localeCompare(b.uid));
    }

    getMarkerCount() {
        return this.getMarkers().length;
    }

    clear() {
        this.markers.clear();
        this.lastEventAt = null;
    }
}

export function createTakMarkerStore(options) {
    return new TakMarkerStore(options);
}
