import { FilteredEvent } from "../types.ts";
import { parseISO } from "date-fns";

function shortenUrl(url: string) {
  url = url.replace(/^https?:\/\/(www\.)*/, "");
  if (url.length > 50) url = url.slice(0, 50) + "…";
  return url;
}

function EventLink({ event: { link } }: { event: FilteredEvent }) {
  return (
    <div>
      {link.startsWith("http") ? (
        <a href={link} title={link} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">
          {shortenUrl(link)}
        </a>
      ) : (
        link
      )}
    </div>
  );
}

function formatTime(iso8601time: string) {
  const d = parseISO(iso8601time);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString();
  }
  return d.toLocaleString();
}

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
                {event.admiralty_reliability || "-"}&#x2009;/&#x2009;{event.admiralty_accuracy || "-"}
              </td>
              <td>{event.event_time}</td>
              <td title={event.creation_time}>{formatTime(event.creation_time)}</td>
              <td className="max-w-30">
                {event.keywords.map((k, i) => (
                  <span className="rounded-sm bg-gray-800 p-1 m-0.5 inline whitespace-nowrap" key={i}>
                    {k}
                  </span>
                ))}
              </td>
              <td className="max-w-30">
                {(event.hcoe_domains ?? []).map((k, i) => (
                  <span className="rounded-sm bg-gray-800 p-1 m-0.5 inline whitespace-nowrap" key={i}>
                    {k}
                  </span>
                ))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
