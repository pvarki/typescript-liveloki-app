import "react-grid-layout/css/styles.css";

import { useCallback, useMemo, useRef } from "react";
import { type Layout, Responsive, WidthProvider } from "react-grid-layout";

import { useDashboardStore } from "../stores/dashboard-store";
import { DEFAULT_DASHBOARD_SETTINGS } from "./dashboard-settings";
import {
  GRID_ALLOW_OVERLAP,
  GRID_DRAG_CANCEL_SELECTOR,
  GRID_DRAG_HANDLE_SELECTOR,
  GRID_PREVENT_COLLISION,
  shouldPersistGridLayoutChange,
} from "./grid-interactions";
import WidgetWrapper from "./WidgetWrapper";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {
  const {
    activeDashboard,
    gridPreview,
    isEditMode,
    updateWidgetPositions,
    selectWidget,
  } = useDashboardStore();

  const containerRef = useRef<HTMLDivElement>(null);

  const layouts = useMemo(() => {
    if (!activeDashboard) return { lg: [] };
    return {
      lg: activeDashboard.widgets.map((w) => ({
        i: w.id,
        x: w.gridPosition.x,
        y: w.gridPosition.y,
        w: w.gridPosition.w,
        h: w.gridPosition.h,
        minW: w.gridPosition.minW,
        minH: w.gridPosition.minH,
      })),
    };
  }, [activeDashboard?.widgets]);

  const commitLayout = useCallback(
    (currentLayout: Layout[], trigger: "layout-change" | "drag-stop" | "resize-stop") => {
      if (!isEditMode || !shouldPersistGridLayoutChange(trigger)) return;
      updateWidgetPositions(
        currentLayout.map((l) => ({
          i: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        }))
      );
    },
    [isEditMode, updateWidgetPositions]
  );

  if (!activeDashboard) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-muted-foreground)]">
        Select or create a dashboard to get started
      </div>
    );
  }

  const effectiveCols = gridPreview?.cols ?? activeDashboard.cols;
  const effectiveRowHeight = gridPreview?.rowHeight ?? activeDashboard.rowHeight;
  const effectiveSettings =
    gridPreview?.settings ?? activeDashboard.settings ?? DEFAULT_DASHBOARD_SETTINGS;

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      onClick={() => selectWidget(null)}
    >
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 0 }}
        cols={{ lg: effectiveCols }}
        rowHeight={effectiveRowHeight}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        compactType={null}
        allowOverlap={GRID_ALLOW_OVERLAP}
        preventCollision={GRID_PREVENT_COLLISION}
        margin={[effectiveSettings.gap, effectiveSettings.gap]}
        containerPadding={[effectiveSettings.padding, effectiveSettings.padding]}
        onDragStop={(currentLayout) => commitLayout(currentLayout, "drag-stop")}
        onResizeStop={(currentLayout) => commitLayout(currentLayout, "resize-stop")}
        draggableHandle={GRID_DRAG_HANDLE_SELECTOR}
        draggableCancel={GRID_DRAG_CANCEL_SELECTOR}
        useCSSTransforms
      >
        {activeDashboard.widgets.map((widget) => (
          <div key={widget.id} className="group relative">
            <WidgetWrapper widget={widget} isEditMode={isEditMode} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
