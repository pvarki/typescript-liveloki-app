// This component is no longer used with OpenLayers-based map.
// Keeping as a no-op placeholder to avoid import breakages if any remain.
import type { LngLatData } from "../types.ts";

export function LocationPinMarker(_props: { location: LngLatData }) {
  return null;
}
