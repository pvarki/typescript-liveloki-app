import "vis-timeline/styles/vis-timeline-graph2d.css";

import { useEffect, useRef, useState } from "react";
import { Timeline, type TimelineOptions } from "vis-timeline";

import type { FilteredEvent } from "../types";

interface TimelineItem {
  id: number;
  content: string;
  start: Date;
  type: "point";
  className?: string;
  title?: string;
}

export function EventsTimeline({ events }: { events: FilteredEvent[] }) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);
  const isDestroying = useRef(false);
  const [mouseTime, setMouseTime] = useState<Date | null>(null);
  const [mousePosition, setMousePosition] = useState<number | null>(null);

  useEffect(() => {
    if (!timelineRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        setMousePosition(x);
      }
    };

    const handleMouseLeave = () => {
      setMousePosition(null);
      setMouseTime(null);
    };

    timelineRef.current.addEventListener("mousemove", handleMouseMove);
    timelineRef.current.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (timelineRef.current) {
        timelineRef.current.removeEventListener("mousemove", handleMouseMove);
        timelineRef.current.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  useEffect(() => {
    if (!timelineRef.current) return;

    try {
      console.log("Creating timeline with events:", events);

      const validItems = events
        .map((event) => {
          try {
            const start = new Date(event.event_time);
            if (Number.isNaN(start.getTime())) {
              console.error("Invalid date for event:", event);
              return null;
            }
            return {
              id: event.id,
              content: event.header,
              start,
              type: "point" as const,
              className: event.alert ? "alert-event" : undefined,
              title: new Date(event.event_time).toLocaleString(), // Add tooltip with exact time
            } satisfies TimelineItem;
          } catch (error) {
            console.error("Error processing event:", event, error);
            return null;
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      console.log("Processed timeline items:", validItems);

      const options: TimelineOptions = {
        height: "200px",
        zoomable: true,
        moveable: true,
        showCurrentTime: false,
        orientation: "top",
        zoomMin: 1000 * 60 * 60, // 1 hour in milliseconds
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years in milliseconds
        timeAxis: {
          scale: "hour" as const,
          step: 1,
        },
        format: {
          minorLabels: {
            millisecond: "SSS",
            second: "HH:mm:ss",
            minute: "HH:mm",
            hour: "HH:mm",
            weekday: "ddd D",
            day: "D",
            week: "w",
            month: "MMM",
            year: "YYYY",
          },
          majorLabels: {
            millisecond: "HH:mm:ss",
            second: "D MMMM HH:mm",
            minute: "ddd D MMMM",
            hour: "ddd D MMMM",
            weekday: "MMMM YYYY",
            day: "MMMM YYYY",
            week: "MMMM YYYY",
            month: "YYYY",
            year: "",
          },
        },
        zoomFriction: 5,
      };

      // Only destroy if we're not already in the process of destroying
      if (timelineInstance.current && !isDestroying.current) {
        console.log("Destroying existing timeline instance");
        isDestroying.current = true;
        try {
          timelineInstance.current.destroy();
        } finally {
          isDestroying.current = false;
        }
      }

      // Only create new instance if we're not destroying
      if (!isDestroying.current) {
        console.log("Creating new timeline instance");
        timelineInstance.current = new Timeline(timelineRef.current, validItems, options);

        timelineInstance.current.on("click", (properties) => {
          if (properties.item) {
            const eventId = properties.item;
            globalThis.location.hash = `#/event/${eventId}`;
          }
        });

        // Add mouse move handler for time indicator
        timelineInstance.current.on("mouseMove", (properties) => {
          if (properties.time) {
            setMouseTime(new Date(properties.time));
          }
        });

        // Add mouse out handler to hide time indicator
        timelineInstance.current.on("mouseOut", () => {
          setMouseTime(null);
        });

        // Add zoom handler to adjust time axis step
        timelineInstance.current.on("rangechange", () => {
          if (!timelineInstance.current) return;

          const window = timelineInstance.current.getWindow();
          const range = window.end.getTime() - window.start.getTime();
          const hoursInRange = range / (1000 * 60 * 60);

          // Adjust scale and step based on visible range
          let scale: "hour" | "day" | "week" | "month" = "hour";
          let step = 1;

          if (hoursInRange > 24 * 365) {
            // More than a year
            scale = "month";
            step = 3; // Show every 3 months
          } else if (hoursInRange > 24 * 30) {
            // More than a month
            scale = "month";
            step = 1; // Show every month
          } else if (hoursInRange > 24 * 7) {
            // More than a week
            scale = "day";
            step = 1; // Show every week
          } else if (hoursInRange > 24) {
            // More than a day
            scale = "day";
            step = 1; // Show every day
          } else if (hoursInRange > 12) {
            // More than 12 hours
            scale = "hour";
            step = 1; // Show every 3 hours
          } else if (hoursInRange > 6) {
            // More than 6 hours
            scale = "hour";
            step = 1; // Show every 2 hours
          } else {
            scale = "hour";
            step = 1; // Show every hour
          }

          timelineInstance.current.setOptions({
            timeAxis: {
              scale,
              step,
            },
          });
        });

        // Set initial zoom level to show a reasonable time range
        const now = new Date();
        const start = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 1 week ago
        const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 1 week ahead
        timelineInstance.current.setWindow(start, end);
      }

      return () => {
        if (timelineInstance.current && !isDestroying.current) {
          console.log("Cleaning up timeline instance");
          isDestroying.current = true;
          try {
            timelineInstance.current.destroy();
          } finally {
            isDestroying.current = false;
            timelineInstance.current = null;
          }
        }
      };
    } catch (error) {
      console.error("Error in timeline effect:", error);
      return;
    }
  }, [events]);

  return (
    <div className="timeline-container">
      <div ref={timelineRef} className="timeline" />
      {mouseTime && mousePosition !== null && (
        <div className="time-indicator" style={{ left: `${mousePosition}px` }}>
          <div className="time-label">{mouseTime.toLocaleString()}</div>
        </div>
      )}
      <style>
        {`
          .timeline-container {
            width: 100%;
            background: #1a1a1a;
            border-radius: 0.375rem;
            overflow: hidden;
            position: relative;
          }
          .timeline {
            width: 100%;
            height: 200px;
          }
          .vis-timeline {
            border: none;
            background: #1a1a1a;
          }
          .vis-item {
            background-color: #3b82f6;
            border-color: #2563eb;
            color: white;
            cursor: pointer;
          }
          .vis-item.alert-event {
            background-color: #ef4444;
            border-color: #dc2626;
          }
          .vis-time-axis {
            background-color: #262626;
            color: #e5e5e5;
          }
          .vis-time-axis .vis-text {
            color: #e5e5e5;
          }
          .vis-panel.vis-center {
            border-color: #404040;
          }
          .vis-panel.vis-top {
            border-color: #404040;
          }
          .vis-panel.vis-bottom {
            border-color: #404040;
          }
          .vis-panel.vis-left {
            border-color: #404040;
          }
          .vis-panel.vis-right {
            border-color: #404040;
          }
          .time-indicator {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background-color: #ef4444;
            pointer-events: none;
            z-index: 1000;
            transform: translateX(-50%);
          }
          .time-label {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ef4444;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
          }
        `}
      </style>
    </div>
  );
}
