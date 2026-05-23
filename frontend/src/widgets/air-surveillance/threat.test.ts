import { describe, expect, it } from "vitest";

import { angularDelta, assessThreat, bearingDegrees, isHeadingToward, isInsideGridSquare } from "./threat";
import type { AirTrack, OperatorLocation } from "./types";

function makeTrack(partial: Partial<AirTrack> = {}): AirTrack {
  return {
    id: "t1",
    trackId: "3456",
    gridLetters: "MH",
    gridE10: 6,
    gridN10: 0,
    heading: 270,
    speed: 600,
    altitude: "matalalla",
    count: 2,
    type: "rynnakkokoneita",
    lat: 60.9,
    lng: 26.7,
    capturedAt: 0,
    ...partial,
  };
}

const user: OperatorLocation = {
  gridLetters: "MH",
  gridE10: 4,
  gridN10: 5,
  lat: 60.99,
  lng: 25.9,
};

describe("bearingDegrees", () => {
  it("returns ~0 for due north", () => {
    expect(bearingDegrees({ lat: 60, lng: 25 }, { lat: 61, lng: 25 })).toBeCloseTo(0, 1);
  });
  it("returns ~90 for due east", () => {
    const b = bearingDegrees({ lat: 60, lng: 25 }, { lat: 60, lng: 26 });
    expect(b).toBeGreaterThan(85);
    expect(b).toBeLessThan(95);
  });
  it("returns ~180 for due south", () => {
    expect(bearingDegrees({ lat: 60, lng: 25 }, { lat: 59, lng: 25 })).toBeCloseTo(180, 1);
  });
});

describe("angularDelta", () => {
  it("handles wrap at 360/0", () => {
    expect(angularDelta(350, 10)).toBe(20);
    expect(angularDelta(10, 350)).toBe(20);
  });
  it("returns 0 for equal angles", () => {
    expect(angularDelta(45, 45)).toBe(0);
  });
});

describe("isInsideGridSquare", () => {
  it("matches same letters and offsets", () => {
    expect(isInsideGridSquare(makeTrack({ gridE10: 4, gridN10: 5 }), user)).toBe(true);
  });
  it("rejects different offsets", () => {
    expect(isInsideGridSquare(makeTrack({ gridE10: 5, gridN10: 5 }), user)).toBe(false);
  });
  it("rejects different letters", () => {
    expect(isInsideGridSquare(makeTrack({ gridLetters: "LH", gridE10: 4, gridN10: 5 }), user)).toBe(false);
  });
});

describe("assessThreat", () => {
  it("returns clear when user location is null", () => {
    expect(assessThreat(makeTrack(), null)).toBe("clear");
  });
  it("returns inside_square when track shares user grid cell", () => {
    expect(assessThreat(makeTrack({ gridE10: 4, gridN10: 5 }), user)).toBe("inside_square");
  });
  it("returns heading_toward when target points at user", () => {
    expect(assessThreat(makeTrack({ heading: 270 }), user)).toBe("heading_toward");
  });
  it("returns clear when target moves away", () => {
    expect(assessThreat(makeTrack({ heading: 90 }), user)).toBe("clear");
  });
});

describe("isHeadingToward tolerance", () => {
  it("just inside tolerance counts (bearing track→user is ~283°, heading 254 is ~29° off)", () => {
    expect(isHeadingToward(makeTrack({ heading: 254 }), user, 30)).toBe(true);
  });
  it("just outside tolerance does not (heading 250 is ~33° off)", () => {
    expect(isHeadingToward(makeTrack({ heading: 250 }), user, 30)).toBe(false);
  });
});
