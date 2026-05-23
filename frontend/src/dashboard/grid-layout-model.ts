import type { GridPosition, WidgetDescriptor, WidgetInstance } from "../types";

function toFiniteInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.round(value));
}

export function sanitizeGridPosition(position: GridPosition, fallbackY: number): GridPosition {
  const minW = toFiniteInteger(position.minW, 1);
  const minH = toFiniteInteger(position.minH, 1);
  const w = Math.max(minW, toFiniteInteger(position.w, minW));
  const h = Math.max(minH, toFiniteInteger(position.h, minH));

  return {
    x: toFiniteInteger(position.x, 0),
    y: toFiniteInteger(position.y, fallbackY),
    w,
    h,
    minW,
    minH,
  };
}

export function sanitizeWidgetsLayout(widgets: WidgetInstance[]): WidgetInstance[] {
  let nextY = 0;

  return widgets.map((widget) => {
    const gridPosition = sanitizeGridPosition(widget.gridPosition, nextY);
    nextY = Math.max(nextY, gridPosition.y + gridPosition.h);
    return {
      ...widget,
      gridPosition,
    };
  });
}

export function createWidgetGridPosition(
  _widgets: WidgetInstance[],
  defaultSize: WidgetDescriptor["defaultSize"],
): GridPosition {
  return {
    x: 0,
    y: 0,
    ...defaultSize,
  };
}
