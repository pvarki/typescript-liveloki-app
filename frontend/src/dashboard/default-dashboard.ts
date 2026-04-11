import type { WidgetInstance } from "../types";
import { createWidgetId } from "./widget-id";

export function createDefaultBattlelogWidgets(): WidgetInstance[] {
  return [
    {
      id: createWidgetId("table"),
      type: "table",
      gridPosition: { x: 0, y: 0, w: 12, h: 6, minW: 5, minH: 4 },
      config: { mode: "battlelog" },
    },
    {
      id: createWidgetId("form"),
      type: "form",
      gridPosition: { x: 12, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
      config: { mode: "battlelog" },
    },
    {
      id: createWidgetId("map"),
      type: "weather-map",
      gridPosition: { x: 0, y: 6, w: 12, h: 7, minW: 6, minH: 5 },
      config: { lat: 60.45, lng: 22.24, zoom: 5 },
    },
    {
      id: createWidgetId("timeline"),
      type: "timeline",
      gridPosition: { x: 12, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
      config: {},
    },
    {
      id: createWidgetId("clock"),
      type: "clock",
      gridPosition: { x: 18, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      config: {},
    },
  ];
}
