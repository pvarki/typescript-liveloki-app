import { useMemo } from "react";

import { useDashboardStore } from "../stores/dashboard-store";

export default function GridLinesOverlay() {
  const { activeDashboard, gridPreview } = useDashboardStore();

  const cols = gridPreview?.cols ?? activeDashboard?.cols ?? 24;
  const rowHeight = gridPreview?.rowHeight ?? activeDashboard?.rowHeight ?? 50;
  const settings = gridPreview?.settings ?? activeDashboard?.settings;
  const gap = settings?.gap ?? 4;
  const padding = settings?.padding ?? 4;

  const gridStyle = useMemo(
    () =>
      ({
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: `${rowHeight}px`,
        gap: `${gap}px`,
        padding: `${padding}px`,
        height: "100%",
      }) as React.CSSProperties,
    [cols, gap, padding, rowHeight],
  );

  const lines = useMemo(() => {
    const count = cols * 30;
    return Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="rounded-sm"
        style={{
          minHeight: `${rowHeight}px`,
          border: "1px dashed red",
        }}
      />
    ));
  }, [cols, rowHeight]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div style={gridStyle}>{lines}</div>
    </div>
  );
}
