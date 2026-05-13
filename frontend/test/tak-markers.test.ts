import { describe, expect, it, vi } from "vitest";

import { createTakMarkerFeature } from "../src/widgets/weather-map";
import { normalizeTakMarkerSnapshot, publishTakMarker, readRefreshMs } from "../src/widgets/weather-map/tak-markers";

describe("TAK marker helpers", () => {
  it("normalizes marker snapshots and rejects invalid coordinates", () => {
    const snapshot = normalizeTakMarkerSnapshot({
      enabled: true,
      connected: false,
      status: "disconnected",
      markerCount: 2,
      markers: [
        { uid: "alpha", lat: 60.45, lng: 22.24, callsign: "Phone" },
        { uid: "bad", lat: Number.NaN, lng: 22.24 },
      ],
    });

    expect(snapshot.enabled).toBe(true);
    expect(snapshot.connected).toBe(false);
    expect(snapshot.markers).toHaveLength(1);
    expect(snapshot.markers[0]).toMatchObject({ uid: "alpha", callsign: "Phone" });
  });

  it("keeps TAK marker refresh intervals fast", () => {
    expect(readRefreshMs("bad", 1000)).toBe(1000);
    expect(readRefreshMs(250, 1000)).toBe(500);
    expect(readRefreshMs(5000, 1000)).toBe(1000);
  });

  it("creates TAK features without BattleLog event ids", () => {
    const feature = createTakMarkerFeature({
      uid: "alpha",
      type: "a-f-G-U-C",
      callsign: "Phone",
      lat: 60.45,
      lng: 22.24,
      hae: null,
      time: null,
      stale: null,
    });

    expect(feature.get("takUid")).toBe("alpha");
    expect(feature.get("eventId")).toBeUndefined();
  });

  it("publishes TAK markers through the API", async () => {
    const originalFetch = globalThis.fetch;
    const calls: unknown[] = [];
    globalThis.fetch = vi.fn(async (...args: unknown[]) => {
      calls.push(args);
      return {
        ok: true,
        json: async () => ({
          marker: { uid: "published", type: "a-n-G", callsign: "Published", lat: 60, lng: 24 },
        }),
      } as Response;
    });

    try {
      const marker = await publishTakMarker({ callsign: "Published", lat: 60, lng: 24 });

      expect(marker.uid).toBe("published");
      expect(calls[0]).toMatchObject([
        "api/tak/markers",
        { method: "POST", headers: { "Content-Type": "application/json" } },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
