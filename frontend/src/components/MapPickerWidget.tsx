import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/maplibre";
import mapStyle from "../helpers/map-style.ts";
import { LngLatData } from "../types.ts";

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
      {selected ? (
        <Marker longitude={selected.lng} latitude={selected.lat}>
          <div className="text-3xl text-red-500">&times;</div>
        </Marker>
      ) : null}
    </Map>
  );
}
