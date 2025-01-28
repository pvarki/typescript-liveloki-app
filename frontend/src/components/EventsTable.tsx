import { FilteredEvent } from "../types.ts";
import { EventLocationLink } from "./EventLocationLink.tsx";
import { EventLink } from "./EventLink.tsx";
import { formatTime } from "../helpers/formatTime.ts";
import { Keywords } from "./Keywords.tsx";
import { EventRelAcc } from "./EventRelAcc.tsx";
import { Link } from "react-router-dom";
import { MdLink } from "react-icons/md";

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
          <th>Author</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => {
          return (
            <tr key={event.id} className={event.alert ? "!bg-red-900" : undefined}>
              <td className="max-w-50">
                <div>
                  {event.header}
                  <Link to={`/event/${event.id}`} className="ps-2">
                    <MdLink className="inline" />
                  </Link>
                </div>
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
              <td className="max-w-30">{event.author}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
