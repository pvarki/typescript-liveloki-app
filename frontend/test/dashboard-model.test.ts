import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseLayout, serializeLayout } from "../src/api/client";
import { useDashboardStore } from "../src/stores/dashboard-store";
import type { WidgetInstance } from "../src/types";

const widget: WidgetInstance = {
  id: "widget-1",
  type: "note",
  gridPosition: { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  config: { text: "hello" },
};

describe("dashboard model", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useDashboardStore.setState({
      activeDashboard: {
        id: "dash-1",
        name: "Test",
        cols: 24,
        rowHeight: 50,
        widgets: [widget],
      },
      isDirty: false,
      selectedWidgetId: null,
    });
  });

  it("round-trips sanitized widget layout JSON", () => {
    const serialized = serializeLayout([widget]);
    expect(parseLayout(serialized)).toEqual([widget]);
  });

  it("returns an empty layout for invalid JSON", () => {
    expect(parseLayout("not json")).toEqual([]);
  });

  it("updates widget grid positions and marks the dashboard dirty", () => {
    useDashboardStore.getState().updateWidgetPositions([{ i: "widget-1", x: 2, y: 3, w: 6, h: 4 }]);

    const state = useDashboardStore.getState();
    expect(state.isDirty).toEqual(true);
    expect(state.activeDashboard?.widgets[0].gridPosition).toMatchObject({ x: 2, y: 3, w: 6, h: 4 });
  });

  it("patches widget config in the active dashboard", () => {
    useDashboardStore.getState().patchWidgetConfig("widget-1", { text: "updated" });

    expect(useDashboardStore.getState().activeDashboard?.widgets[0].config).toMatchObject({ text: "updated" });
  });
});
