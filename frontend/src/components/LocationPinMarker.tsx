import { MdLocationPin } from "react-icons/md";
import { Marker } from "react-map-gl/maplibre";
import { LngLatData } from "../types.ts";

export function LocationPinMarker({ location }: { location: LngLatData }) {
  return (
    <Marker
      longitude={location.lng}
      latitude={location.lat}
      anchor="bottom"
      className="h-[2em] text-pink-400"
    >
      <MdLocationPin size="2em" />
    </Marker>
  );
}
