import useSWR from "swr";

export interface NewTakMarker {
  callsign: string;
  lat: number;
  lng: number;
  remarks?: string;
  type?: string;
}

export interface TakMarker {
  uid: string;
  type: string;
  callsign: string;
  lat: number;
  lng: number;
  hae: number | null;
  time: string | null;
  stale: string | null;
}

export interface TakMarkerSnapshot {
  enabled: boolean;
  connected: boolean;
  status: "disabled" | "connecting" | "connected" | "disconnected" | "error" | string;
  lastEventAt: string | null;
  lastError: string | null;
  dbPollEnabled?: boolean;
  lastDbPollAt?: string | null;
  lastDbPollError?: string | null;
  markerCount: number;
  markers: TakMarker[];
}

export const DEFAULT_TAK_MARKER_SNAPSHOT: TakMarkerSnapshot = {
  enabled: false,
  connected: false,
  status: "disabled",
  lastEventAt: null,
  lastError: null,
  dbPollEnabled: false,
  lastDbPollAt: null,
  lastDbPollError: null,
  markerCount: 0,
  markers: [],
};

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeMarker(value: unknown): TakMarker | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const lat = readNumber(record.lat);
  const lng = readNumber(record.lng);
  const uid = readString(record.uid).trim();
  if (!uid || lat === null || lng === null) return null;

  return {
    uid,
    type: readString(record.type),
    callsign: readString(record.callsign, uid) || uid,
    lat,
    lng,
    hae: readNumber(record.hae),
    time: readNullableString(record.time),
    stale: readNullableString(record.stale),
  };
}

export function normalizeTakMarkerSnapshot(value: unknown): TakMarkerSnapshot {
  if (!value || typeof value !== "object") return DEFAULT_TAK_MARKER_SNAPSHOT;
  const record = value as Record<string, unknown>;
  const markers = Array.isArray(record.markers)
    ? record.markers.map(normalizeMarker).filter((marker): marker is TakMarker => marker !== null)
    : [];

  return {
    enabled: Boolean(record.enabled),
    connected: Boolean(record.connected),
    status: readString(record.status, record.enabled ? "disconnected" : "disabled"),
    lastEventAt: readNullableString(record.lastEventAt),
    lastError: readNullableString(record.lastError),
    dbPollEnabled: Boolean(record.dbPollEnabled),
    lastDbPollAt: readNullableString(record.lastDbPollAt),
    lastDbPollError: readNullableString(record.lastDbPollError),
    markerCount: typeof record.markerCount === "number" ? record.markerCount : markers.length,
    markers,
  };
}

async function getTakMarkerSnapshot(): Promise<TakMarkerSnapshot> {
  const response = await fetch("api/tak/markers");
  if (!response.ok) throw new Error(`Failed to fetch TAK markers: ${response.statusText}`);
  return normalizeTakMarkerSnapshot(await response.json());
}

export function useTakMarkers(enabled: boolean, refreshInterval: number) {
  return useSWR(enabled ? "tak-markers" : null, getTakMarkerSnapshot, {
    refreshInterval,
    fallbackData: DEFAULT_TAK_MARKER_SNAPSHOT,
  });
}

export async function publishTakMarker(marker: NewTakMarker): Promise<TakMarker> {
  const response = await fetch("api/tak/markers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(marker),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string" ? payload.error : `Failed to publish TAK marker: ${response.status}`;
    throw new Error(message);
  }
  const normalized = normalizeMarker((payload as { marker?: unknown }).marker);
  if (!normalized) throw new Error("TAK marker publish response was invalid");
  return normalized;
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function readRefreshMs(value: unknown, fallback = 1000): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 500), 1000);
}
