import { FilteredEvent } from "../types.ts";

function shortenUrl(url: string) {
  url = url.replace(/^https?:\/\/(www\.)*/, "");
  if (url.length > 50) url = url.slice(0, 50) + "…";
  return url;
}

export function EventsTable({ events }: { events: FilteredEvent[] }) {
  return (
    <table className="ll-events-table">
      <thead>
        <tr>
          <th>Header</th>
          <th>Link</th>
          <th>Source</th>
          <th>Reliability&#x2009;/&#x2009;Accuracy</th>
          <th>Event time</th>
          <th>Creation time</th>
          <th>Keywords</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => {
          return (
            <tr key={event.id} className={event.alert ? "bg-red-900" : undefined}>
              <td>{event.header}</td>
              <td className="max-w-30">
                {event.link.startsWith("http") ? (
                  <a
                    href={event.link}
                    title={event.link}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    {shortenUrl(event.link)}
                  </a>
                ) : (
                  event.link
                )}
              </td>
              <td>{event.source}</td>
              <td>
                {event.admiralty_reliability || "-"}&#x2009;/&#x2009;{event.admiralty_accuracy || "-"}
              </td>
              <td>{event.event_time}</td>
              <td>{event.creation_time}</td>
              <td className="max-w-30">
                {event.keywords.map((k, i) => (
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
