import useSWR from "swr";
import React from "react";
import { Event } from "../types.ts";
import { EventsTable } from "./EventsTable";
import { filterEvents } from "../helpers/eventFilter.ts";

export function EventsList() {
  const [search, setSearch] = React.useState("");
  const [highlight, setHighlight] = React.useState("");
  const eventsSWR = useSWR<Event[]>("events", () => fetch("events").then((r) => r.json()), {
    refreshInterval: 10000,
  });
  const events = eventsSWR.data;
  const filteredEvents = React.useMemo(
    () => filterEvents(events ?? [], search, highlight),
    [events, search, highlight],
  );

  if (eventsSWR.error) {
    return <div>Error loading events: {eventsSWR.error.message}</div>;
  }
  if (events === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Search"
          className="ll-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="text"
          placeholder="Alert Keyword"
          className="ll-input"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
        />
      </div>
      {events.length > 0 ? (
        filteredEvents.length > 0 ? (
          <EventsTable events={filteredEvents} />
        ) : (
          <p>No events found matching your filter.</p>
        )
      ) : (
        <p>No events found.</p>
      )}
    </div>
  );
}
