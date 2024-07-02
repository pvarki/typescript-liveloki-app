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
          const keywordsString = event.keywords.join(", ");
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
              <td>{keywordsString}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
