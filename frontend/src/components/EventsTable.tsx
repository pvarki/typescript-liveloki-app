import { FilteredEvent } from "../types.ts";

export function EventsTable({ events }: { events: FilteredEvent[] }) {
  return (
    <table className="mdl-data-table mdl-js-data-table mdl-shadow--2dp">
      <thead>
        <tr>
          <th className="mdl-data-table__cell--non-numeric">Header</th>
          <th className="mdl-data-table__cell--non-numeric">Link</th>
          <th className="mdl-data-table__cell--non-numeric">Source</th>
          <th className="mdl-data-table__cell--non-numeric">Reliability</th>
          <th className="mdl-data-table__cell--non-numeric">Accuracy</th>
          <th className="mdl-data-table__cell--non-numeric">Event time</th>
          <th className="mdl-data-table__cell--non-numeric">Creation time</th>
          <th className="mdl-data-table__cell--non-numeric">Keywords</th>
        </tr>
      </thead>
      <tbody className="list">
        {events.map((event: any) => {
          const keywordsString = event.keywords.join(", ");
          return (
            <tr key={event.id} className={event.alert ? "alert" : undefined}>
              <td className="mdl-data-table__cell--non-numeric header">{event.header}</td>
              <td className="mdl-data-table__cell--non-numeric link">
                <a href={event.link} target="_blank">
                  {event.link}
                </a>
              </td>
              <td className="mdl-data-table__cell--non-numeric source">{event.source}</td>
              <td className="mdl-data-table__cell--non-numeric admiralty_reliability">
                {event.admiralty_reliability}
              </td>
              <td className="mdl-data-table__cell--non-numeric admiralty_accuracy">
                {event.admiralty_accuracy}
              </td>
              <td className="mdl-data-table__cell--non-numeric event_time">{event.event_time}</td>
              <td className="mdl-data-table__cell--non-numeric creation_time">{event.creation_time}</td>
              <td className="mdl-data-table__cell--non-numeric keywords">{keywordsString}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
