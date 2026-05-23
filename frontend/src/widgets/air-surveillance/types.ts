export type AltitudeCode = "pinnassa" | "matalalla" | "korkealla";

export interface BroadcastInput {
  trackId: string;
  gridLetters: string;
  gridE10: number;
  gridN10: number;
  heading: number;
  speed: number;
  altitude: AltitudeCode;
  count: number;
  type: string;
}

export interface AirTrack extends BroadcastInput {
  id: string;
  lat: number;
  lng: number;
  capturedAt: number;
}

export type ThreatTier = "clear" | "heading_toward" | "inside_square";

export interface OperatorLocation {
  gridLetters: string;
  gridE10: number;
  gridN10: number;
  lat: number;
  lng: number;
}

export type AlarmState = "ilmahalytys" | "ilmavaroitus" | "vaara_ohi";
