import type { AirTrack, OperatorLocation, ThreatTier } from "./types";

const RADIANS = Math.PI / 180;
const DEGREES = 180 / Math.PI;

export function bearingDegrees(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const lat1 = from.lat * RADIANS;
  const lat2 = to.lat * RADIANS;
  const dLng = (to.lng - from.lng) * RADIANS;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = Math.atan2(y, x) * DEGREES;
  return (brng + 360) % 360;
}

export function angularDelta(a: number, b: number): number {
  const diff = Math.abs(((a - b + 540) % 360) - 180);
  return diff;
}

export function isHeadingToward(
  track: AirTrack,
  user: OperatorLocation,
  toleranceDeg = 30,
): boolean {
  const bearingToUser = bearingDegrees({ lat: track.lat, lng: track.lng }, { lat: user.lat, lng: user.lng });
  return angularDelta(track.heading, bearingToUser) <= toleranceDeg;
}

export function isInsideGridSquare(track: AirTrack, user: OperatorLocation): boolean {
  return (
    track.gridLetters === user.gridLetters &&
    track.gridE10 === user.gridE10 &&
    track.gridN10 === user.gridN10
  );
}

export function assessThreat(track: AirTrack, user: OperatorLocation | null): ThreatTier {
  if (!user) return "clear";
  if (isInsideGridSquare(track, user)) return "inside_square";
  if (isHeadingToward(track, user)) return "heading_toward";
  return "clear";
}
