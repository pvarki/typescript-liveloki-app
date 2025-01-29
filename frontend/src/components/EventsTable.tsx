import React from "react";
import { MdLink } from "react-icons/md";
import { Link } from "react-router-dom";

import { formatTime } from "../helpers/formatTime.ts";
import { FilteredEvent } from "../types.ts";
import { EventLink } from "./EventLink.tsx";
import { EventLocationLink } from "./EventLocationLink.tsx";
import { EventRelAcc } from "./EventRelAcc.tsx";
import { Keywords } from "./Keywords.tsx";

type ColumnSpec = { id: string; title: string; render: (event: FilteredEvent) => React.ReactElement };

export const columns: Array<ColumnSpec> = [
  {
    id: "header",
    title: "Header\u2009/\u2009Link",
    render: (event) => (
      <td className="max-w-1/2">
        <div>
          {event.header}
          <Link to={`/event/${event.id}`} className="ps-2">
            <MdLink className="inline" />
          </Link>
        </div>
        {event.link ? <EventLink event={event} /> : null}
      </td>
    ),
  },
  {
    id: "source",
    title: "Source",
    render: (event) => <td>{event.source}</td>,
  },
  {
    id: "reliability",
    title: "Reliability\u2009/\u2009Accuracy",
    render: (event) => (
      <td>
        <EventRelAcc event={event} />
      </td>
    ),
  },
  {
    id: "event_time",
    title: "Event time",
    render: (event) => <td>{event.event_time}</td>,
  },
  {
    id: "creation_time",
    title: "Creation time",
    render: (event) => <td title={event.creation_time}>{formatTime(event.creation_time)}</td>,
  },
  {
    id: "location",
    title: "Location",
    render: (event) => (
      <td>
        <EventLocationLink event={event} />
      </td>
    ),
  },
  {
    id: "keywords",
    title: "Keywords",
    render: (event) => (
      <td className="max-w-32">
        <Keywords keywords={event.keywords} />
      </td>
    ),
  },
  {
    id: "domains",
    title: "Domains",
    render: (event) => (
      <td className="max-w-32">
        <Keywords keywords={event.hcoe_domains ?? []} />
      </td>
    ),
  },
  {
    id: "author",
    title: "Author",
    render: (event) => <td className="max-w-32">{event.author}</td>,
  },
];

interface EventsTableProps {
  events: FilteredEvent[];
  visibleColumns: ReadonlySet<string>;
}

export function EventsTable({ events, visibleColumns }: EventsTableProps) {
  if (visibleColumns.size === 0) {
    return <div className="p-2 text-center">No columns selected to view.</div>;
  }
  return (
    <table className="ll-events-table">
      <thead>
        <tr>
          {columns
            .filter(({ id }) => visibleColumns.has(id))
            .map(({ id, title }) => (
              <th key={id}>{title}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id} className={event.alert ? "!bg-red-900" : undefined}>
            {columns.filter(({ id }) => visibleColumns.has(id)).map(({ render }) => render(event))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
