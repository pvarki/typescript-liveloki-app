import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiError } from "../src/api/client";
import { listDashboards, parseLayout, serializeLayout } from "../src/api/client";
import {
  DEFAULT_DASHBOARD_SETTINGS,
  sanitizeDashboardSettings,
} from "../src/dashboard/dashboard-settings";
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
      dashboards: [],
      dashboardError: null,
      hasLoadedDashboards: false,
      activeDashboard: {
        id: "dash-1",
        name: "Test",
        cols: 24,
        rowHeight: 50,
        settings: DEFAULT_DASHBOARD_SETTINGS,
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

  it("hydrates missing and malformed dashboard settings with safe defaults", () => {
    expect(sanitizeDashboardSettings(null)).toEqual(DEFAULT_DASHBOARD_SETTINGS);
    expect(sanitizeDashboardSettings({ gap: 8, widgetHeaders: "always" })).toEqual({
      ...DEFAULT_DASHBOARD_SETTINGS,
      gap: 8,
      widgetHeaders: "always",
    });
    expect(
      sanitizeDashboardSettings({
        gap: 7,
        padding: -1,
        widgetBorders: "loud",
        widgetHeaders: "sometimes",
      }),
    ).toEqual(DEFAULT_DASHBOARD_SETTINGS);
  });


  it("rejects non-OK dashboard list responses with the API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Missing mTLS client certificate" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(listDashboards()).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Missing mTLS client certificate",
    } satisfies Partial<ApiError>);
  });

  it("keeps dashboard state render-safe when loading dashboards fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Missing mTLS client certificate" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    useDashboardStore.setState({
      dashboards: [
        {
          id: "existing",
          name: "Existing",
          cols: 24,
          rowHeight: 50,
          settings: DEFAULT_DASHBOARD_SETTINGS,
          layout: "[]",
          createdAt: "2026-04-11T00:00:00.000Z",
          updatedAt: "2026-04-11T00:00:00.000Z",
        },
      ],
      dashboardError: null,
      hasLoadedDashboards: false,
    });

    await useDashboardStore.getState().loadDashboards();

    const state = useDashboardStore.getState();
    expect(state.dashboards).toEqual([]);
    expect(state.hasLoadedDashboards).toEqual(true);
    expect(state.dashboardError).toEqual("Missing mTLS client certificate");
  });

  it("updates dashboard grid settings and marks the dashboard dirty", () => {
    useDashboardStore.getState().updateGridConfig(32, 40, {
      gap: 8,
      padding: 16,
      widgetBorders: "visible",
      widgetHeaders: "always",
    });

    const state = useDashboardStore.getState();
    expect(state.isDirty).toEqual(true);
    expect(state.activeDashboard).toMatchObject({
      cols: 32,
      rowHeight: 40,
      settings: {
        gap: 8,
        padding: 16,
        widgetBorders: "visible",
        widgetHeaders: "always",
      },
    });
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
