import { forward, toPoint } from "mgrs";

export const DEFAULT_FINNISH_ZONE = "35V";

export interface ParsedGrid {
  letters: string;
  e10: number;
  n10: number;
}

export function parseGridString(input: string): ParsedGrid | null {
  const cleaned = input.trim().toUpperCase().replaceAll(/\s+/g, "");
  const match = cleaned.match(/^([A-Z]{2})(\d)(\d)$/);
  if (!match) return null;
  const [, letters, e, n] = match;
  return { letters, e10: Number(e), n10: Number(n) };
}

export function formatGridString({ letters, e10, n10 }: ParsedGrid): string {
  return `${letters} ${e10}${n10}`;
}

export function gridToLatLng(
  letters: string,
  e10: number,
  n10: number,
  zone: string = DEFAULT_FINNISH_ZONE,
): { lat: number; lng: number } | null {
  if (!/^[A-Z]{2}$/.test(letters)) return null;
  if (e10 < 0 || e10 > 9 || n10 < 0 || n10 > 9) return null;
  const mgrsString = `${zone}${letters}${e10}${n10}`;
  try {
    const [lng, lat] = toPoint(mgrsString);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function latLngToGrid(
  lat: number,
  lng: number,
  zone: string = DEFAULT_FINNISH_ZONE,
): ParsedGrid | null {
  try {
    const mgrs = forward([lng, lat], 1);
    const expectedPrefix = zone;
    const body = mgrs.startsWith(expectedPrefix) ? mgrs.slice(expectedPrefix.length) : mgrs.slice(3);
    const match = body.match(/^([A-Z]{2})(\d)(\d)$/);
    if (!match) return null;
    return { letters: match[1], e10: Number(match[2]), n10: Number(match[3]) };
  } catch {
    return null;
  }
}
