import React from "react";
import { MdLink } from "react-icons/md";
import { Link } from "react-router-dom";

import { formatTime } from "../helpers/formatTime.ts";
import { FilteredEvent } from "../types.ts";
import { EventLink } from "./EventLink.tsx";
import { EventLocationLink } from "./EventLocationLink.tsx";
import { EventRelAcc } from "./EventRelAcc.tsx";
import { Keywords } from "./Keywords.tsx";

export interface EventsTableOptions {
  visibleColumns: ReadonlySet<string>;
  showKeywordsAndDomainsInHeaderColumn: boolean;
}

interface ColumnSpec {
  id: string;
  title: string;
  render: (event: FilteredEvent, options: EventsTableOptions) => React.ReactElement;
}

export const columns: Array<ColumnSpec> = [
  {
    id: "header",
    title: "Header\u2009/\u2009Link",
    render: (event, { showKeywordsAndDomainsInHeaderColumn }) => (
      <td className="max-w-1/2" key="header">
        <div>
          {event.header}
          <Link to={`/event/${event.id}`} className="ps-2">
            <MdLink className="inline" />
          </Link>
        </div>
        {event.link ? <EventLink event={event} /> : null}
        {showKeywordsAndDomainsInHeaderColumn ? (
          <>
            <Keywords keywords={event.keywords} />
            <Keywords keywords={event.hcoe_domains ?? []} />
          </>
        ) : null}
      </td>
    ),
  },
  {
    id: "source",
    title: "Source",
    render: (event) => <td key="source">{event.source}</td>,
  },
  {
    id: "reliability",
    title: "Reliability\u2009/\u2009Accuracy",
    render: (event) => (
      <td key="relacc">
        <EventRelAcc event={event} />
      </td>
    ),
  },
  {
    id: "event_time",
    title: "Event time",
    render: (event) => <td key="event_time">{event.event_time}</td>,
  },
  {
    id: "creation_time",
    title: "Creation time",
    render: (event) => (
      <td key="creation_time" title={event.creation_time}>
        {formatTime(event.creation_time)}
      </td>
    ),
  },
  {
    id: "location",
    title: "Location",
    render: (event) => (
      <td key="location">
        <EventLocationLink event={event} />
      </td>
    ),
  },
  {
    id: "group",
    title: "Groups",
    render: (event) => (
      <td key="group" className="max-w-32">
        {event.groups && event.groups.length > 0 ? (
          <div className="space-y-1">
            {event.groups.map((group, index) => (
              <div key={index}>
                <Link 
                  to={`/group/${encodeURIComponent(group)}`}
                  className="text-green-400 font-medium hover:text-green-300 hover:underline cursor-pointer text-sm"
                >
                  {group}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-slate-500">-</span>
        )}
      </td>
    ),
  },
  {
    id: "keywords",
    title: "Keywords",
    render: (event) => (
      <td key="keywords" className="max-w-32">
        <Keywords keywords={event.keywords} />
      </td>
    ),
  },
  {
    id: "domains",
    title: "Domains",
    render: (event) => (
      <td key="domains" className="max-w-32">
        <Keywords keywords={event.hcoe_domains ?? []} />
      </td>
    ),
  },
  {
    id: "author",
    title: "Author",
    render: (event) => (
      <td key="author" className="max-w-32">
        {event.author}
      </td>
    ),
  },
];

interface EventsTableProps {
  events: FilteredEvent[];
  options: EventsTableOptions;
}

function shouldShowColumn(id: string, options: EventsTableOptions) {
  return (
    options.visibleColumns.has(id) &&
    !(options.showKeywordsAndDomainsInHeaderColumn && (id == "keywords" || id == "domains"))
  );
}

export function EventsTable({ events, options }: EventsTableProps) {
  const { visibleColumns } = options;
  if (visibleColumns.size === 0) {
    return <div className="p-2 text-center">No columns selected to view.</div>;
  }
  return (
    <table className="ll-events-table">
      <thead>
        <tr>
          {columns
            .filter(({ id }) => shouldShowColumn(id, options))
            .map(({ id, title }) => (
              <th key={id}>{title}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id} className={event.alert ? "!bg-red-900" : undefined}>
            {columns
              .filter(({ id }) => shouldShowColumn(id, options))
              .map(({ render }) => render(event, options))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
