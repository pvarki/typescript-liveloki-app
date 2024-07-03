import { FilteredEvent } from "../types.ts";
import { MdLocationPin } from "react-icons/md";
import * as HoverCard from "@radix-ui/react-hover-card";
import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/maplibre";
import mapStyle from "../helpers/map-style.ts";
import { LngLatData } from "../types.ts";

export function EventLocationLink({ event }: { event: FilteredEvent }) {
  const { location_lng: lng, location_lat: lat, location: text } = event;
  const hasLatLng = lat !== null && lng !== null;
  if (!text && !hasLatLng) return null;
  const content = text ? text : `${lat ? lat.toFixed(2) : "-"}, ${lng ? lng.toFixed(2) : "-"}`;
  if (hasLatLng) {
    return (
      <HoverCard.Root>
        <HoverCard.Trigger asChild>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}`}
            target="_blank"
            rel="noreferrer"
            referrerPolicy="no-referrer"
          >
            <MdLocationPin className="inline h-6" />
            {content}
          </a>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content>
            <div className="flex border">
              <Map
                initialViewState={{
                  latitude: lat,
                  longitude: lng,
                  zoom: 6,
                }}
                style={{ width: "200px", height: "200px" }}
                mapStyle={mapStyle as never /* TODO: get rid of the never */}
                attributionControl={false}
              />
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    );
  }
  return content;
}
