import { describe, expect, it } from "vitest";

import { formatGridString, gridToLatLng, latLngToGrid, parseGridString } from "./grid";

describe("parseGridString", () => {
  it("parses 'MH 45'", () => {
    expect(parseGridString("MH 45")).toEqual({ letters: "MH", e10: 4, n10: 5 });
  });
  it("parses lowercase and no-space variants", () => {
    expect(parseGridString("mh45")).toEqual({ letters: "MH", e10: 4, n10: 5 });
  });
  it("rejects invalid inputs", () => {
    expect(parseGridString("MH 4")).toBeNull();
    expect(parseGridString("123")).toBeNull();
    expect(parseGridString("")).toBeNull();
  });
});

describe("formatGridString", () => {
  it("formats back to canonical form", () => {
    expect(formatGridString({ letters: "MH", e10: 4, n10: 5 })).toBe("MH 45");
  });
});

describe("gridToLatLng", () => {
  it("converts a known Finnish grid (MH 45 in 35V) to southern Finland coordinates", () => {
    const point = gridToLatLng("MH", 4, 5);
    expect(point).not.toBeNull();
    if (!point) return;
    expect(point.lat).toBeGreaterThan(60);
    expect(point.lat).toBeLessThan(62);
    expect(point.lng).toBeGreaterThan(24);
    expect(point.lng).toBeLessThan(28);
  });
  it("returns null on invalid input", () => {
    expect(gridToLatLng("M", 4, 5)).toBeNull();
    expect(gridToLatLng("MH", -1, 5)).toBeNull();
    expect(gridToLatLng("MH", 4, 10)).toBeNull();
  });
});

describe("latLngToGrid", () => {
  it("round-trips with gridToLatLng for a known cell", () => {
    const point = gridToLatLng("MH", 4, 5);
    expect(point).not.toBeNull();
    if (!point) return;
    const grid = latLngToGrid(point.lat, point.lng);
    expect(grid).toEqual({ letters: "MH", e10: 4, n10: 5 });
  });
});
