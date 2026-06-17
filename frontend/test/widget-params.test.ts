import { describe, expect, it } from "vitest";

import { readWidgetParam, updateWidgetSearchParams } from "../src/hooks/widget-params-model";

describe("widget params model", () => {
  it("sets selectedItem while preserving unrelated params", () => {
    const next = updateWidgetSearchParams("?group=alpha&page=2", { selectedItem: "event-1" });

    expect(next?.toString()).toEqual("group=alpha&page=2&selectedItem=event-1");
  });

  it("clears time without removing sibling params", () => {
    const next = updateWidgetSearchParams("selectedItem=event-1&time=2026-04-11T10%3A00%3A00.000Z", {
      time: null,
    });

    expect(next?.toString()).toEqual("selectedItem=event-1");
  });

  it("returns null for redundant writes", () => {
    expect(updateWidgetSearchParams("selectedItem=event-1", { selectedItem: "event-1" })).toEqual(null);
  });

  it("supports prefixed widget params", () => {
    const next = updateWidgetSearchParams("selectedItem=event-1", { "form.header": "Prefilled" });

    expect(readWidgetParam(next ?? "", "form.header")).toEqual("Prefilled");
    expect(readWidgetParam(next ?? "", "selectedItem")).toEqual("event-1");
  });
});
