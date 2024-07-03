import { FilteredEvent } from "../types.ts";
import { EventLocationLink } from "./EventLocationLink.tsx";
import { EventLink } from "./EventLink.tsx";
import { formatTime } from "../helpers/formatTime.ts";
import { Keywords } from "./Keywords.tsx";
import { EventRelAcc } from "./EventRelAcc.tsx";

export function EventsTable({ events }: { events: FilteredEvent[] }) {
  return (
    <table className="ll-events-table">
      <thead>
        <tr>
          <th>Header&#x2009;/&#x2009;Link</th>
          <th>Source</th>
          <th>Reliability&#x2009;/&#x2009;Accuracy</th>
          <th>Event time</th>
          <th>Creation time</th>
          <th>Location</th>
          <th>Keywords</th>
          <th>Domains</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => {
          return (
            <tr key={event.id} className={event.alert ? "!bg-red-900" : undefined}>
              <td className="max-w-50">
                {event.header}
                {event.link ? <EventLink event={event} /> : null}
              </td>
              <td>{event.source}</td>
              <td>
                <EventRelAcc event={event} />
              </td>
              <td>{event.event_time}</td>
              <td title={event.creation_time}>{formatTime(event.creation_time)}</td>
              <td>
                <EventLocationLink event={event} />
              </td>
              <td className="max-w-30">
                <Keywords keywords={event.keywords} />
              </td>
              <td className="max-w-30">
                <Keywords keywords={event.hcoe_domains ?? []} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
