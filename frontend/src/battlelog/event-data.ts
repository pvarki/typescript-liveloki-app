import useSWR, { mutate } from "swr";

import { getEvents, postEvents } from "../helpers/api";
import type { Event, EventPayload } from "../types";

export const BATTLELOG_EVENTS_KEY = "events";

export interface BattlelogTableColumn {
  key: string;
  label: string;
}

export interface BattlelogTableRow {
  id: string;
  event: Event;
  cells: Record<string, string>;
}

export const BATTLELOG_TABLE_COLUMNS: BattlelogTableColumn[] = [
  { key: "header", label: "Header" },
  { key: "link", label: "Link" },
  { key: "source", label: "Source" },
  { key: "reliability", label: "Reliability" },
  { key: "accuracy", label: "Accuracy" },
  { key: "event_time", label: "Event time" },
  { key: "creation_time", label: "Creation time" },
  { key: "location", label: "Location" },
  { key: "groups", label: "Groups" },
  { key: "keywords", label: "Keywords" },
  { key: "domains", label: "Domains" },
  { key: "author", label: "Author" },
  { key: "notes", label: "Notes" },
];

export const DEFAULT_VISIBLE_BATTLELOG_COLUMNS = BATTLELOG_TABLE_COLUMNS.map((column) => column.key);

function joinValues(values: unknown): string {
  if (Array.isArray(values)) return values.filter(Boolean).map(String).join(", ");
  if (values === null || values === undefined) return "";
  return String(values);
}

export function eventToTableRow(event: Event): BattlelogTableRow {
  return {
    id: String(event.id),
    event,
    cells: {
      header: event.header,
      link: event.link,
      source: event.source,
      reliability: event.admiralty_reliability,
      accuracy: event.admiralty_accuracy,
      event_time: event.event_time,
      creation_time: event.creation_time,
      location: event.location ?? "",
      groups: joinValues(event.groups),
      keywords: joinValues(event.keywords),
      domains: joinValues(event.hcoe_domains),
      author: event.author,
      notes: event.notes ?? "",
    },
  };
}

export function useBattlelogEvents() {
  return useSWR(BATTLELOG_EVENTS_KEY, getEvents, {
    refreshInterval: 10_000,
  });
}

export async function submitBattlelogEvents(events: readonly EventPayload[]) {
  const result = await postEvents(events);
  await mutate(BATTLELOG_EVENTS_KEY);
  return result;
}

export function createEmptyBattlelogEvent(): EventPayload {
  return {
    header: "",
    link: "",
    source: "",
    admiralty_reliability: "",
    admiralty_accuracy: "",
    event_time: "",
    keywords: [],
    hcoe_domains: [],
    location: "",
    author: "",
    notes: "",
  };
}
