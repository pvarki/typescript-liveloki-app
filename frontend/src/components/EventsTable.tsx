import { FilteredEvent } from "../types.ts";

export function EventsTable({ events }: { events: FilteredEvent[] }) {
  return (
    <table className="ll-events-table">
      <thead>
        <tr>
          <th>Header</th>
          <th>Link</th>
          <th>Source</th>
          <th>Reliability</th>
          <th>Accuracy</th>
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
              <td>
                <a href={event.link} target="_blank">
                  {event.link}
                </a>
              </td>
              <td>{event.source}</td>
              <td>{event.admiralty_reliability}</td>
              <td>{event.admiralty_accuracy}</td>
              <td>{event.event_time}</td>
              <td>{event.creation_time}</td>
              <td>
                {event.keywords.map((k, i) => (
                  <span className="rounded-sm bg-gray-800 p-1 m-0.5 inline" key={i}>
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
