import { FilteredEvent } from "../types.ts";
import { EventLink } from "./EventLink.tsx";
import { formatTime } from "../helpers/formatTime.ts";
import { EventLocationLink } from "./EventLocationLink.tsx";
import { Keywords } from "./Keywords.tsx";

export function EventCard({ event }: { event: FilteredEvent }) {
  return (
    <div className="p-2 rounded-sm">
      <h3 className="text-lg font-bold">{event.header}</h3>
      <table className="ll-event-card-table">
        <tbody>
          <tr>
            <th>Link</th>
            <td>{event.link ? <EventLink event={event} /> : null}</td>
          </tr>
          <tr>
            <th>Source</th>
            <td>{event.source}</td>
          </tr>
          <tr>
            <th>Reliability&#x2009;/&#x2009;Accuracy</th>
            <td>
              {event.admiralty_reliability || "-"}&#x2009;/&#x2009;{event.admiralty_accuracy || "-"}
            </td>
          </tr>
          <tr>
            <th>Event time</th>
            <td>{event.event_time}</td>
          </tr>
          <tr>
            <th>Creation time</th>
            <td title={event.creation_time}>{formatTime(event.creation_time)}</td>
          </tr>
          <tr>
            <th>Location</th>
            <td>
              <EventLocationLink event={event} />
            </td>
          </tr>
          <tr>
            <th>Keywords</th>
            <td>
              <Keywords keywords={event.keywords} />
            </td>
          </tr>
          <tr>
            <th>Domains</th>
            <td>
              <Keywords keywords={event.hcoe_domains ?? []} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
