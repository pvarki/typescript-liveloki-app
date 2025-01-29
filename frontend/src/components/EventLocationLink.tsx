import * as HoverCard from "@radix-ui/react-hover-card";
import { MdLocationPin } from "react-icons/md";
import Map from "react-map-gl/maplibre";

import mapStyle from "../helpers/map-style.ts";
import { FilteredEvent } from "../types.ts";
import { LocationPinMarker } from "./LocationPinMarker.tsx";

export function EventLocationLink({ event }: { event: FilteredEvent }) {
  const { location_lng: lng, location_lat: lat, location: text } = event;
  const hasLatLng = lat !== null && lng !== null;
  if (!text && !hasLatLng) return null;
  const content = text || (hasLatLng ? `${lat.toFixed(2)},\u00A0${lng.toFixed(2)}` : "");
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
                style={{ width: "250px", height: "200px" }}
                mapStyle={mapStyle as never /* TODO: get rid of the never */}
                attributionControl={false}
              >
                <LocationPinMarker location={{ lat, lng }} />
              </Map>
            </div>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    );
  }
  return content;
}
