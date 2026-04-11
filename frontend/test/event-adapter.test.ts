import { describe, expect, it } from "vitest";

import { eventToTableRow } from "../src/battlelog/event-data";
import { battlelogDataSource } from "../src/data-sources/battlelog";
import type { Event } from "../src/types";
import { eventToTimelineItem } from "../src/widgets/timeline";
import { eventHasCoordinates } from "../src/widgets/weather-map";

const baseEvent: Event = {
  id: "event-1",
  header: "Header",
  link: "https://example.com",
  source: "Source",
  admiralty_reliability: "A",
  admiralty_accuracy: "1",
  event_time: "2026-04-11T05:00:00.000Z",
  creation_time: "2026-04-11T05:01:00.000Z",
  keywords: ["alpha", "bravo"],
  images: null,
  hcoe_domains: ["Cyber"],
  location: "Helsinki",
  location_lat: 60.1695,
  location_lng: 24.9354,
  author: "Tester",
  groups: ["Group A"],
  notes: "Notes",
};

describe("Battlelog event adapter", () => {
  it("exposes minimal data-source metadata and accessors", () => {
    expect(battlelogDataSource).toMatchObject({
      id: "battlelog",
      name: "Battlelog events",
      listKey: "events",
    });
    expect(battlelogDataSource.getItemId(baseEvent)).toEqual("event-1");
    expect(battlelogDataSource.getTimestamp?.(baseEvent)).toEqual("2026-04-11T05:00:00.000Z");
    expect(battlelogDataSource.searchableFields).toContain("header");
    expect(battlelogDataSource.columns.map((column) => column.key)).toContain("event_time");
  });

  it("uses adapter column value getters for Battlelog rows", () => {
    const header = battlelogDataSource.columns.find((column) => column.key === "header");

    expect(header?.getValue(baseEvent)).toEqual("Header");
  });

  it("maps events to searchable table cells", () => {
    const row = eventToTableRow(baseEvent);

    expect(row.id).toEqual("event-1");
    expect(row.cells.header).toEqual("Header");
    expect(row.cells.keywords).toEqual("alpha, bravo");
    expect(row.cells.domains).toEqual("Cyber");
    expect(row.cells.groups).toEqual("Group A");
  });

  it("uses safe placeholders for missing optional values", () => {
    const row = eventToTableRow({
      ...baseEvent,
      location: null,
      hcoe_domains: null,
      groups: undefined,
      notes: undefined,
    });

    expect(row.cells.location).toEqual("");
    expect(row.cells.domains).toEqual("");
    expect(row.cells.groups).toEqual("");
    expect(row.cells.notes).toEqual("");
  });

  it("maps valid event_time to timeline items and skips invalid dates", () => {
    const item = eventToTimelineItem(baseEvent);

    expect(item).toMatchObject({ id: "event-1", content: "Header", type: "point" });
    expect(item?.start.toISOString()).toEqual("2026-04-11T05:00:00.000Z");
    expect(eventToTimelineItem({ ...baseEvent, event_time: "not-a-date" })).toEqual(null);
  });

  it("accepts only finite numeric coordinates for map markers", () => {
    expect(eventHasCoordinates(baseEvent)).toEqual(true);
    expect(eventHasCoordinates({ ...baseEvent, location_lat: null })).toEqual(false);
    expect(eventHasCoordinates({ ...baseEvent, location_lng: null })).toEqual(false);
    expect(eventHasCoordinates({ ...baseEvent, location_lat: Number.NaN })).toEqual(false);
    expect(eventHasCoordinates({ ...baseEvent, location_lng: Number.POSITIVE_INFINITY })).toEqual(false);
  });
});
