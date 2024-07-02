import { Event, FilteredEvent } from "../types.ts";

const eventFields: (keyof Event)[] = [
  "header",
  "link",
  "source",
  "admiralty_reliability",
  "admiralty_accuracy",
  "event_time",
  "creation_time",
  "keywords",
];

function eventMatchesQuery(event: Event, highlight: string) {
  return eventFields.some((field) => {
    if (field === "keywords") {
      return event[field].some((keyword) => keyword.toLowerCase().includes(highlight));
    }
    return String(event[field]).toLowerCase().includes(highlight);
  });
}

export function filterEvents(events: Event[], search: string, highlight: string): FilteredEvent[] {
  if (!(search || highlight)) {
    return events;
  }
  highlight = highlight.toLowerCase();
  search = search.toLowerCase();
  return events
    .map((event): FilteredEvent | null => {
      if (search && !eventMatchesQuery(event, search)) {
        return null;
      }
      if (highlight) {
        return { ...event, alert: eventMatchesQuery(event, highlight) };
      }
      return event;
    })
    .filter((event) => event !== null);
}
