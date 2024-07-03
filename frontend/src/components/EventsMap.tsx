import { FilteredEvent } from "../types.ts";
import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/maplibre";
import mapStyle from "../helpers/map-style.ts";
import cx from "classnames";
import { MdLocationPin } from "react-icons/md";
import { useState } from "react";
import { EventCard } from "./EventCard.tsx";

export function EventsMap({ events }: { events: FilteredEvent[] }) {
  const [popupEvent, setPopupEvent] = useState<FilteredEvent | null>(null);
  const eventsWithLatLng = events.filter((e) => e.location_lat !== null && e.location_lng !== null);
  if (!eventsWithLatLng.length) {
    return <div className="text-center">No events with location data</div>;
  }
  const map = (
    <Map
      style={{ width: "100%", height: "500px" }}
      mapStyle={mapStyle as never /* TODO: get rid of the never */}
    >
      <NavigationControl />
      <ScaleControl />
      {eventsWithLatLng.map((ev) => (
        <Marker
          key={ev.id}
          longitude={ev.location_lng!}
          latitude={ev.location_lat!}
          anchor="bottom"
          className={cx("h-[3em] cursor-pointer text-center", ev.alert ? "text-red-500" : "text-pink-400")}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setPopupEvent(ev);
          }}
        >
          <div className="bg-black/60 p-px rounded-sm">{ev.header}</div>
          <MdLocationPin size="2em" className="cursor-pointer block mx-auto" />
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
