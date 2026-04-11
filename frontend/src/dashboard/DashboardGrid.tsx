import "react-grid-layout/css/styles.css";

import { useCallback, useMemo, useRef } from "react";
import { type Layout,Responsive, WidthProvider } from "react-grid-layout";

import { useDashboardStore } from "../stores/dashboard-store";
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

  const cols = activeDashboard?.cols ?? 24;
  const rowHeight = activeDashboard?.rowHeight ?? 50;

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
        cols={{ lg: cols }}
        rowHeight={rowHeight}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        compactType={null}
        allowOverlap={GRID_ALLOW_OVERLAP}
        preventCollision={GRID_PREVENT_COLLISION}
        margin={[4, 4]}
        containerPadding={[4, 4]}
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
