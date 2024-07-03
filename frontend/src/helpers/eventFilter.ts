import { Event, FilteredEvent } from "../types.ts";

// TODO: this could be made a Record from event to searcher, to make sure
//       all of events' fields are covered and TS will complain if a field is added
const eventFields: (keyof Event)[] = [
  "header",
  "link",
  "source",
  "admiralty_reliability",
  "admiralty_accuracy",
  "event_time",
  "creation_time",
  "keywords",
  "hcoe_domains",
];

function eventMatchesQuery(event: Event, highlight: string) {
  return eventFields.some((field) => {
    if (field === "keywords" || field === "hcoe_domains") {
      return (event[field] ?? []).some((keyword) => keyword.toLowerCase().includes(highlight));
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
