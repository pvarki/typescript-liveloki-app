import Map, { NavigationControl, ScaleControl } from "react-map-gl/maplibre";

import mapStyle from "../helpers/map-style.ts";
import { LngLatData } from "../types.ts";
import { LocationPinMarker } from "./LocationPinMarker.tsx";

type MapPickerWidgetProps = { onPick: (location: LngLatData) => void; selected?: LngLatData };

export function MapPickerWidget({ onPick, selected }: MapPickerWidgetProps) {
  return (
    <Map
      initialViewState={{
        latitude: 60.45,
        longitude: 22.24,
        zoom: 4,
      }}
      style={{ width: "100%", height: "500px" }}
      mapStyle={mapStyle as never /* TODO: get rid of the never */}
      onClick={({ lngLat }) => onPick(lngLat)}
    >
      <NavigationControl />
      <ScaleControl />
      {selected ? <LocationPinMarker location={selected} /> : null}
    </Map>
  );
}
