import * as Popover from "@radix-ui/react-popover";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useMemo, useState } from "react";
import { MdList, MdMap, MdViewColumn } from "react-icons/md";
import useSWR from "swr";

import { getEvents } from "../helpers/api.ts";
import { filterEvents } from "../helpers/eventFilter.ts";
import { toggleInSet } from "../helpers/immutability.ts";
import type { Event } from "../types.ts";
import { EventsMap } from "./EventsMap.tsx";
import { columns, EventsTable, EventsTableOptions } from "./EventsTable";

type EventsListMode = "list" | "map";

interface EventsListProps {
  initialEvents?: Event[];
}

export function EventsList({ initialEvents }: EventsListProps = {}) {
  const [search, setSearch] = useState(""); // Use this to capture the search field input
  const [highlight, setHighlight] = useState(""); // For alert keywords
  const [mode, setMode] = useState<EventsListMode>("list"); // For list/map toggle
  const [showKeywordsAndDomainsInHeaderColumn, setShowKeywordsAndDomainsInHeaderColumn] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set(columns.map((c) => c.id)));

  // Fetch all events from the backend (only if no initialEvents provided)
  const eventsSWR = useSWR(initialEvents ? null : "events", getEvents, {
    refreshInterval: 10_000,
  });

  // Fetch filtered events from the backend when search is active
  const { data: backendFilteredEvents } = useSWR(
    search.trim() ? `/api/events?search=${encodeURIComponent(search.trim())}` : null,
    (url) => fetch(url).then((res) => res.json()),
  );

  const events = initialEvents || eventsSWR.data;

  // Use backend search results if search is active;
  // use client-side filtering if no search or backend results
  const filteredEvents = useMemo(
    () =>
      search.trim() && backendFilteredEvents
        ? backendFilteredEvents
        : filterEvents(events ?? [], "", highlight),
    [events, search, highlight, backendFilteredEvents],
  );

  if (!initialEvents && eventsSWR.error) {
    return <div>Error loading events: {eventsSWR.error.message}</div>;
  }
  if (!initialEvents && events === undefined) {
    return <div>Loading...</div>;
  }

  const options: EventsTableOptions = {
    visibleColumns,
    showKeywordsAndDomainsInHeaderColumn,
  };

  let component;
  switch (mode) {
    case "list": {
      component = <EventsTable events={filteredEvents} options={options} />;
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
        <input
          type="text"
          placeholder="Search"
          className="ll-input grow"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="text"
          placeholder="Alert Keyword"
          className="ll-input grow"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
        />
        {mode === "list" ? (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="ll-btn">
                <MdViewColumn />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="bg-slate-800/80 p-2 text-sm max-w-48">
                {columns.map(({ id, title }) => (
                  <label key={id} className="flex items-center gap-1 select-none">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(id)}
                      disabled={showKeywordsAndDomainsInHeaderColumn && (id == "keywords" || id == "domains")}
                      onChange={(e) => {
                        setVisibleColumns((visibleColumns) =>
                          toggleInSet(visibleColumns, id, e.target.checked),
                        );
                      }}
                    />
                    {title}
                  </label>
                ))}
                <div className="flex gap-1 py-1">
                  <button
                    className="ll-btn grow"
                    onClick={() => setVisibleColumns(new Set(columns.map((c) => c.id)))}
                  >
                    All
                  </button>
                  <button className="ll-btn grow" onClick={() => setVisibleColumns(new Set())}>
                    None
                  </button>
                </div>
                <label className="flex items-center gap-1 select-none">
                  <input
                    type="checkbox"
                    checked={showKeywordsAndDomainsInHeaderColumn}
                    onChange={(e) => setShowKeywordsAndDomainsInHeaderColumn(e.target.checked)}
                  />
                  Show Keywords and Domains in Header Column
                </label>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : null}
        <ToggleGroup.Root
          className="ll-toggles"
          type="single"
          value={mode}
          onValueChange={(value) => {
            // `ToggleGroup`s allow "un-clicking" an option,
            // so default to "list" if the incoming value
            // would be the empty string, so we always
            // render _something_.
            setMode((value || "list") as EventsListMode);
          }}
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
