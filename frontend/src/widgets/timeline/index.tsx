import "vis-timeline/styles/vis-timeline-graph2d.min.css";

import { useEffect, useMemo, useRef } from "react";
import { Timeline } from "vis-timeline/standalone";

import { useBattlelogEvents } from "../../battlelog/event-data";
import { useEventDetailStore } from "../../battlelog/event-detail-store";
import type { Event, WidgetDescriptor, WidgetProps } from "../../types";

interface TimelineItem {
  id: string;
  content: string;
  start: Date;
  title: string;
  type: "point";
}

function buildTooltip(event: Event): string {
  return [
    event.source && `<b>Source:</b> ${event.source}`,
    event.location && `<b>Location:</b> ${event.location}`,
    event.keywords?.length ? `<b>Keywords:</b> ${event.keywords.join(", ")}` : null,
    event.notes && `<b>Notes:</b> ${event.notes}`,
  ]
    .filter(Boolean)
    .join("<br>") || "No details";
}

export function eventToTimelineItem(event: Event): TimelineItem | null {
  const start = new Date(event.event_time);
  if (Number.isNaN(start.getTime())) return null;

  return {
    id: String(event.id),
    content: event.header || "Untitled",
    start,
    title: buildTooltip(event),
    type: "point",
  };
}

function refreshTimelineView(timeline: Timeline, items: TimelineItem[]) {
  timeline.setItems(items);
  timeline.redraw();

  if (items.length === 0) return;

  requestAnimationFrame(() => {
    timeline.redraw();
    timeline.fit({ animation: false });
  });
}

function TimelineWidget({ isEditMode }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const openEvent = useEventDetailStore((state) => state.openEvent);
  const { data: events, error, isLoading } = useBattlelogEvents();

  const items = useMemo(
    () => (events ?? []).map(eventToTimelineItem).filter((item): item is TimelineItem => item !== null),
    [events],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const timeline = new Timeline(containerRef.current, [], {
      height: "100%",
      editable: false,
      selectable: !isEditMode,
      moveable: true,
      zoomable: true,
      autoResize: true,
      showCurrentTime: true,
      showTooltips: true,
      tooltip: { followMouse: true, overflowMethod: "flip" as const },
      orientation: { axis: "bottom" as const },
      margin: { item: 10 },
    });

    timeline.on("click", (properties) => {
      if (properties.item) openEvent(properties.item);
    });

    timelineRef.current = timeline;
    return () => {
      timeline.destroy();
      timelineRef.current = null;
    };
  }, [isEditMode, openEvent]);

  useEffect(() => {
    if (!timelineRef.current) return;
    refreshTimelineView(timelineRef.current, items);
  }, [items]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (!timelineRef.current) return;
      refreshTimelineView(timelineRef.current, items);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="timeline-widget h-full w-full" />
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 text-sm text-[var(--color-muted-foreground)]">
          Loading timeline...
        </div>
      )}
      {error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 text-sm text-[var(--color-danger)]">
          Failed to load events: {String(error)}
        </div>
      )}
      {!isLoading && !error && items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 text-center text-sm text-[var(--color-muted-foreground)]">
          No events with valid event_time values found.
        </div>
      )}
    </div>
  );
}

export const timelineDescriptor: WidgetDescriptor = {
  type: "timeline",
  name: "Timeline",
  description: "Visualize Battlelog events on an interactive timeline",
  icon: <span className="text-lg">&#x1F4C5;</span>,
  defaultSize: { w: 6, h: 4, minW: 4, minH: 3 },
  defaultConfig: {},
  component: TimelineWidget,
  needsScroll: false,
};
