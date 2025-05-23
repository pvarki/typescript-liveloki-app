import cx from "classnames";
import { useState } from "react";
import { MdLocationPin } from "react-icons/md";
import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/maplibre";

import mapStyle from "../helpers/map-style.ts";
import { FilteredEvent } from "../types.ts";
import { EventCard } from "./EventCard.tsx";

function truncateHeader(text: string, length: number): string {
  if (text.length >= length - 1) {
    // Truncate from head and tail and add ellipsis in the middle
    const head = text.slice(0, length / 2 - 1);
    const tail = text.slice(-length / 2 + 2);
    return `${head}…${tail}`;
  }
  return text;
}

export function EventsMap({ events }: { events: FilteredEvent[] }) {
  const [shouldTruncateEventTitles, setShouldTruncateEventTitles] = useState(true);
  const [popupEvent, setPopupEvent] = useState<FilteredEvent | null>(null);
  const eventsWithLatLng = events.filter((e) => e.location_lat !== null && e.location_lng !== null);
  if (eventsWithLatLng.length === 0) {
    return <div className="text-center">No events with location data</div>;
  }
  const map = (
    <Map
      style={{ width: "100%", height: "500px" }}
      mapStyle={mapStyle as never /* TODO: get rid of the never */}
      onZoom={(e) => setShouldTruncateEventTitles(e.target.getZoom() < 3.5)}
    >
      <NavigationControl />
      <ScaleControl />
      {eventsWithLatLng.map((ev) => (
        <Marker
          key={`${ev.id}?${ev.alert}`}
          longitude={ev.location_lng!}
          latitude={ev.location_lat!}
          anchor="bottom"
          className={cx("cursor-pointer text-center group", ev.alert ? "text-red-500" : "text-pink-400")}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setPopupEvent(ev);
          }}
        >
          <div className="bg-black/60 p-px max-w-24 break-words rounded-sm group-hover:text-white">
            {shouldTruncateEventTitles ? truncateHeader(ev.header, 20) : ev.header}
          </div>
          <MdLocationPin size="2em" className="block mx-auto group-hover:text-pink-300" />
        </Marker>
      ))}
    </Map>
  );
  return (
    <div className="gap-1 grid grid-cols-3">
      <div className={cx(popupEvent ? "col-span-2" : "col-span-3")}>{map}</div>
      {popupEvent ? <EventCard event={popupEvent} /> : null}
    </div>
  );
}
