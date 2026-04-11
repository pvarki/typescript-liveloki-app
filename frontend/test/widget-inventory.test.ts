import { describe, expect, it } from "vitest";

import { useWidgetRegistry } from "../src/stores/widget-registry";
import { registerAllWidgets } from "../src/widgets/register-all";

describe("widget registry inventory", () => {
  it("registers all required Dashboard widgets", () => {
    useWidgetRegistry.setState({ widgets: new Map() });
    registerAllWidgets();

    expect(new Set(useWidgetRegistry.getState().getAll().map((widget) => widget.type))).toEqual(new Set([
      "calendar",
      "clock",
      "form",
      "inventory",
      "metric",
      "note",
      "rtmp-video",
      "table",
      "timeline",
      "timer",
      "todo",
      "weather-map",
    ]));
  });
});
