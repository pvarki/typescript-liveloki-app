import useSWR from "swr";
import { useState, useMemo } from "react";
import { EventsTable } from "./EventsTable";
import { filterEvents } from "../helpers/eventFilter.ts";
import { MdList, MdMap } from "react-icons/md";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { EventsMap } from "./EventsMap.tsx";
import { getEvents } from "../helpers/api.ts";

type EventsListMode = "list" | "map";

export function EventsList() {
  const [search, setSearch] = useState(""); // Use this to capture the search field input
  const [highlight, setHighlight] = useState(""); // For alert keywords
  const [mode, setMode] = useState<EventsListMode>("list"); // For list/map toggle

  // Fetch all events from the backend
  const eventsSWR = useSWR("events", getEvents, {
    refreshInterval: 10_000,
  });

  // Fetch filtered events from the backend when search is active
  const { data: backendFilteredEvents } = useSWR(
    search.trim() ? `/ll/api/events?search=${encodeURIComponent(search.trim())}` : null,
    (url) => fetch(url).then((res) => res.json()),
  );

  const events = eventsSWR.data;

  // Use backend search results if search is active;
  // use client-side filtering if no search or backend results
  const filteredEvents = useMemo(
    () =>
      search.trim() && backendFilteredEvents
        ? backendFilteredEvents
        : filterEvents(events ?? [], "", highlight),
    [events, search, highlight, backendFilteredEvents],
  );

  if (eventsSWR.error) {
    return <div>Error loading events: {eventsSWR.error.message}</div>;
  }
  if (events === undefined) {
    return <div>Loading...</div>;
  }

  let component;
  switch (mode) {
    case "list": {
      component = <EventsTable events={filteredEvents} />;
      break;
    }
    case "map": {
      component = <EventsMap events={filteredEvents} />;
      break;
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        {/* Search Field */}
        <input
          type="text"
          placeholder="Search"
          className="ll-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* Highlight Field */}
        <input
          type="text"
          placeholder="Alert Keyword"
          className="ll-input"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
        />
        {/* Toggle Group */}
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
      {filteredEvents.length > 0 ? (
        <div className="overflow-x-auto">{component}</div>
      ) : (
        <p>No events found.</p>
      )}
    </div>
  );
}
