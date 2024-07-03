import useSWR from "swr";
import React from "react";
import { EventsTable } from "./EventsTable";
import { filterEvents } from "../helpers/eventFilter.ts";
import { MdList, MdMap } from "react-icons/md";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { EventsMap } from "./EventsMap.tsx";
import { getEvents } from "../helpers/api.ts";

type EventsListMode = "list" | "map";

export function EventsList() {
  const [search, setSearch] = React.useState("");
  const [highlight, setHighlight] = React.useState("");
  const [mode, setMode] = React.useState<EventsListMode>("list");
  const eventsSWR = useSWR("events", getEvents, {
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
  let component;
  switch (mode) {
    case "list":
      component = <EventsTable events={filteredEvents} />;
      break;
    case "map":
      component = <EventsMap events={filteredEvents} />;
      break;
  }

  return (
    <div>
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
        <ToggleGroup.Root
          className="ll-toggles"
          type="single"
          value={mode}
          onValueChange={(value) => setMode(value as EventsListMode)}
        >
          <ToggleGroup.Item value="map" aria-label="Map">
            <MdMap />
          </ToggleGroup.Item>
          <ToggleGroup.Item value="list" aria-label="List">
            <MdList />
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
      {events.length > 0 ? (
        filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">{component}</div>
        ) : (
          <p>No events found matching your filter.</p>
        )
      ) : (
        <p>No events found.</p>
      )}
    </div>
  );
}
