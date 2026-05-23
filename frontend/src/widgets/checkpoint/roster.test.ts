import { describe, expect, it } from "vitest";

import type { Event } from "../../types";
import { currentStateOf, deriveInsideRoster, findInsidePersonsByBase, nextNamesakeSlug, parseSlug, slugifyName } from "./roster";

function evt(opts: { name: string; state: "in" | "out"; at: string; slug?: string }): Event {
  const slug = opts.slug ?? slugifyName(opts.name);
  return {
    id: `${slug}-${opts.at}`,
    header: opts.state === "in" ? `Checkpoint IN: ${opts.name}` : `Checkpoint OUT: ${opts.name}`,
    link: "",
    source: "checkpoint-widget",
    admiralty_reliability: "",
    admiralty_accuracy: "",
    event_time: opts.at,
    creation_time: opts.at,
    keywords: ["checkpoint", `state:${opts.state}`, `person:${slug}`],
    images: null,
    hcoe_domains: null,
    location: null,
    location_lat: null,
    location_lng: null,
    author: "checkpoint",
  };
}

describe("slugifyName", () => {
  it("lowercases and trims", () => {
    expect(slugifyName(" LIISA ")).toBe("liisa");
  });
  it("hyphenates whitespace", () => {
    expect(slugifyName(" Matti Virtanen ")).toBe("matti-virtanen");
  });
  it("collapses multiple spaces", () => {
    expect(slugifyName("Aino  K.")).toBe("aino-k.");
  });
});

describe("currentStateOf", () => {
  it("returns unknown when no events", () => {
    expect(currentStateOf(undefined, "matti")).toBe("unknown");
    expect(currentStateOf([], "matti")).toBe("unknown");
  });
  it("returns unknown when slug never logged", () => {
    expect(currentStateOf([evt({ name: "Liisa", state: "in", at: "2026-05-23T10:00:00Z" })], "matti")).toBe("unknown");
  });
  it("returns latest state for the slug", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti", state: "out", at: "2026-05-23T11:00:00Z" }),
      evt({ name: "Matti", state: "in", at: "2026-05-23T12:00:00Z" }),
    ];
    expect(currentStateOf(events, "matti")).toBe("in");
  });
  it("ignores events that aren't checkpoint events", () => {
    const events: Event[] = [
      { ...evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }), keywords: ["something-else"] },
    ];
    expect(currentStateOf(events, "matti")).toBe("unknown");
  });
});

describe("deriveInsideRoster", () => {
  it("returns empty for empty input", () => {
    expect(deriveInsideRoster([])).toEqual([]);
    expect(deriveInsideRoster()).toEqual([]);
  });
  it("includes a person whose latest event is IN", () => {
    const roster = deriveInsideRoster([evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" })]);
    expect(roster).toHaveLength(1);
    expect(roster[0].slug).toBe("matti");
    expect(roster[0].displayName).toBe("Matti");
  });
  it("excludes a person whose latest event is OUT", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti", state: "out", at: "2026-05-23T11:00:00Z" }),
    ];
    expect(deriveInsideRoster(events)).toEqual([]);
  });
  it("re-includes after OUT then IN", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti", state: "out", at: "2026-05-23T11:00:00Z" }),
      evt({ name: "Matti", state: "in", at: "2026-05-23T12:00:00Z" }),
    ];
    expect(deriveInsideRoster(events)).toHaveLength(1);
  });
  it("sorts by most recently arrived first", () => {
    const events = [
      evt({ name: "Aino", state: "in", at: "2026-05-23T09:00:00Z" }),
      evt({ name: "Matti", state: "in", at: "2026-05-23T11:00:00Z" }),
      evt({ name: "Liisa", state: "in", at: "2026-05-23T10:00:00Z" }),
    ];
    expect(deriveInsideRoster(events).map((p) => p.slug)).toEqual(["matti", "liisa", "aino"]);
  });
  it("uses display name from the most recent event", () => {
    const events = [
      evt({ name: "matti", state: "in", at: "2026-05-23T09:00:00Z" }),
      evt({ name: "Matti", state: "out", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "MATTI", state: "in", at: "2026-05-23T11:00:00Z" }),
    ];
    expect(deriveInsideRoster(events)[0].displayName).toBe("MATTI");
  });
});

describe("parseSlug", () => {
  it("returns base only when no numeric suffix", () => {
    expect(parseSlug("matti")).toEqual({ base: "matti", num: null });
    expect(parseSlug("matti-virtanen")).toEqual({ base: "matti-virtanen", num: null });
  });
  it("splits numeric suffix", () => {
    expect(parseSlug("matti-2")).toEqual({ base: "matti", num: 2 });
    expect(parseSlug("matti-virtanen-3")).toEqual({ base: "matti-virtanen", num: 3 });
  });
});

describe("findInsidePersonsByBase", () => {
  it("returns all insides sharing a base slug (auto-numbered)", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti #2", state: "in", at: "2026-05-23T11:00:00Z", slug: "matti-2" }),
      evt({ name: "Liisa", state: "in", at: "2026-05-23T12:00:00Z" }),
    ];
    const result = findInsidePersonsByBase(events, "matti");
    expect(result.map((p) => p.slug).toSorted()).toEqual(["matti", "matti-2"]);
  });
  it("includes discriminated namesakes (matti-v, matti-virtanen)", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti V", state: "in", at: "2026-05-23T11:00:00Z", slug: "matti-v" }),
      evt({ name: "Matti Virtanen", state: "in", at: "2026-05-23T12:00:00Z", slug: "matti-virtanen" }),
      evt({ name: "Liisa", state: "in", at: "2026-05-23T13:00:00Z" }),
    ];
    const result = findInsidePersonsByBase(events, "matti");
    expect(result.map((p) => p.slug).toSorted()).toEqual(["matti", "matti-v", "matti-virtanen"]);
  });
  it("does not match unrelated names like mattias", () => {
    const events = [
      evt({ name: "Mattias", state: "in", at: "2026-05-23T10:00:00Z", slug: "mattias" }),
    ];
    expect(findInsidePersonsByBase(events, "matti")).toEqual([]);
  });
  it("narrows when typed name is more specific (matti-v matches matti-v exactly, not matti-virtanen)", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti V", state: "in", at: "2026-05-23T11:00:00Z", slug: "matti-v" }),
      evt({ name: "Matti Virtanen", state: "in", at: "2026-05-23T12:00:00Z", slug: "matti-virtanen" }),
    ];
    expect(findInsidePersonsByBase(events, "matti-v").map((p) => p.slug)).toEqual(["matti-v"]);
  });
  it("excludes outside namesakes", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti #2", state: "in", at: "2026-05-23T11:00:00Z", slug: "matti-2" }),
      evt({ name: "Matti #2", state: "out", at: "2026-05-23T12:00:00Z", slug: "matti-2" }),
    ];
    expect(findInsidePersonsByBase(events, "matti").map((p) => p.slug)).toEqual(["matti"]);
  });
});

describe("nextNamesakeSlug", () => {
  it("returns base when never used", () => {
    expect(nextNamesakeSlug([], "matti")).toBe("matti");
  });
  it("returns base-2 when only base is in history", () => {
    const events = [evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" })];
    expect(nextNamesakeSlug(events, "matti")).toBe("matti-2");
  });
  it("returns base-3 when matti and matti-2 exist", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti #2", state: "in", at: "2026-05-23T11:00:00Z", slug: "matti-2" }),
    ];
    expect(nextNamesakeSlug(events, "matti")).toBe("matti-3");
  });
  it("fills the smallest free slot above base-2", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti #3", state: "in", at: "2026-05-23T11:00:00Z", slug: "matti-3" }),
    ];
    expect(nextNamesakeSlug(events, "matti")).toBe("matti-2");
  });
  it("counts out events too (history-based, not just inside)", () => {
    const events = [
      evt({ name: "Matti", state: "in", at: "2026-05-23T10:00:00Z" }),
      evt({ name: "Matti", state: "out", at: "2026-05-23T11:00:00Z" }),
    ];
    expect(nextNamesakeSlug(events, "matti")).toBe("matti-2");
  });
});
