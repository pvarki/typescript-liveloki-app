import { BATTLELOG_EVENTS_KEY, BATTLELOG_TABLE_COLUMNS, eventToTableRow } from "../battlelog/event-data";
import { getEvent, getEvents } from "../helpers/api";
import type { Event } from "../types";
import type { DataSourceAdapter } from "./types";

export const battlelogDataSource: DataSourceAdapter<Event> = {
  id: "battlelog",
  name: "Battlelog events",
  listKey: BATTLELOG_EVENTS_KEY,
  listFetcher: getEvents,
  detailKey: (id) => ["battlelog-detail", String(id)] as const,
  detailFetcher: (id) => getEvent(String(id)),
  getItemId: (event) => String(event.id),
  getTimestamp: (event) => event.event_time || null,
  columns: BATTLELOG_TABLE_COLUMNS.map((column) => ({
    ...column,
    getValue: (event) => eventToTableRow(event).cells[column.key] ?? "",
  })),
  searchableFields: BATTLELOG_TABLE_COLUMNS.map((column) => column.key),
};
