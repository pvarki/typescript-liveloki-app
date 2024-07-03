import { FilteredEvent } from "../types.ts";
import { MdLocationPin } from "react-icons/md";

export function EventLocationLink({ event }: { event: FilteredEvent }) {
  const { location_lng: lng, location_lat: lat, location: text } = event;
  const hasLatLng = lat !== null && lng !== null;
  if (!text && !hasLatLng) return null;
  const content = text ? text : `${lat ? lat.toFixed(2) : "-"}, ${lng ? lng.toFixed(2) : "-"}`;
  if (hasLatLng) {
    return (
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}`}
        target="_blank"
        rel="noreferrer"
        referrerPolicy="no-referrer"
      >
        <MdLocationPin className="inline h-6" />
        {content}
      </a>
    );
  }
  return content;
}
