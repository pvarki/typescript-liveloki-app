import { describe, expect, it } from "vitest";

import type { Event } from "../../types";
import { deriveActiveAlarm } from "./alarm";

function evt(partial: Partial<Event> & { keywords: string[]; event_time: string }): Event {
  return {
    id: Math.random().toString(36).slice(2),
    header: "x",
    link: "",
    source: "",
    admiralty_reliability: "",
    admiralty_accuracy: "",
    creation_time: partial.event_time,
    images: null,
    hcoe_domains: null,
    location: null,
    location_lat: null,
    location_lng: null,
    author: "",
    ...partial,
  };
}

describe("deriveActiveAlarm", () => {
  it("returns null on empty events", () => {
    expect(deriveActiveAlarm([])).toBeNull();
    expect(deriveActiveAlarm()).toBeNull();
  });

  it("returns null when no alarm keywords are present", () => {
    expect(deriveActiveAlarm([evt({ keywords: ["air-track"], event_time: "2026-05-22T10:00:00Z" })])).toBeNull();
  });

  it("returns ilmahalytys when latest alarm event is ilmahalytys", () => {
    const result = deriveActiveAlarm([
      evt({ keywords: ["alarm", "alarm:vaara_ohi"], event_time: "2026-05-22T09:00:00Z" }),
      evt({ keywords: ["alarm", "alarm:ilmahalytys"], event_time: "2026-05-22T10:00:00Z" }),
    ]);
    expect(result?.state).toBe("ilmahalytys");
  });

  it("returns null when latest alarm event is vaara_ohi", () => {
    expect(
      deriveActiveAlarm([
        evt({ keywords: ["alarm", "alarm:ilmahalytys"], event_time: "2026-05-22T09:00:00Z" }),
        evt({ keywords: ["alarm", "alarm:vaara_ohi"], event_time: "2026-05-22T10:00:00Z" }),
      ]),
    ).toBeNull();
  });
});
