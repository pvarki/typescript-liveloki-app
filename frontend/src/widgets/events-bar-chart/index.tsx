import { FormGroup, HTMLSelect } from "@blueprintjs/core";
import { useMemo } from "react";
import { MdBarChart } from "react-icons/md";

import { useBattlelogEvents } from "../../battlelog/event-data";
import type { ConfigPanelProps, Event, WidgetDescriptor, WidgetProps } from "../../types";

type EventsBarChartXAxis = "tags" | "hours-24h" | "days-7d";
type EventsBarChartMetric = "event-count";

interface EventsBarChartConfig {
  xAxis: EventsBarChartXAxis;
  metric: EventsBarChartMetric;
}

interface BarDatum {
  key: string;
  label: string;
  value: number;
}

const DEFAULT_CONFIG: Record<string, unknown> & EventsBarChartConfig = {
  xAxis: "tags",
  metric: "event-count",
};

function readConfig(config: Record<string, unknown>): EventsBarChartConfig {
  const xAxis = ["tags", "hours-24h", "days-7d"].includes(String(config.xAxis))
    ? (config.xAxis as EventsBarChartXAxis)
    : DEFAULT_CONFIG.xAxis;

  return {
    xAxis,
    metric: "event-count",
  };
}

function eventDate(event: Event): Date | null {
  const value = event.event_time || event.creation_time;
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return null;
  return date;
}

function eventTags(event: Event): string[] {
  const eventWithTags = event as Event & { tags?: string[] };
  return eventWithTags.tags ?? event.keywords ?? [];
}

function hourLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" });
}

function sortBarsByValueAndLabel(bars: BarDatum[]): BarDatum[] {
  const sorted: BarDatum[] = [];
  for (const bar of bars) {
    const insertAt = sorted.findIndex(
      (candidate) => candidate.value < bar.value || (candidate.value === bar.value && candidate.label > bar.label),
    );
    if (insertAt === -1) {
      sorted.push(bar);
    } else {
      sorted.splice(insertAt, 0, bar);
    }
  }
  return sorted;
}

function getTagBars(events: readonly Event[]): BarDatum[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const tag of eventTags(event)) {
      const normalized = tag.trim();
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }
    }
  }

  const bars = [...counts.entries()].map(([tag, value]) => ({ key: tag, label: tag, value }));
  return sortBarsByValueAndLabel(bars).slice(0, 12);
}

function getHourlyBars(events: readonly Event[], now: Date): BarDatum[] {
  const hourStarts = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(now);
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() - 23 + index);
    return date;
  });
  const counts = new Map(hourStarts.map((date) => [date.toISOString(), 0]));
  const firstHour = hourStarts[0].getTime();

  for (const event of events) {
    const date = eventDate(event);
    if (!date || date.getTime() < firstHour || date.getTime() > now.getTime()) continue;
    date.setMinutes(0, 0, 0);
    const key = date.toISOString();
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return hourStarts.map((date) => ({
    key: date.toISOString(),
    label: hourLabel(date),
    value: counts.get(date.toISOString()) ?? 0,
  }));
}

function getDailyBars(events: readonly Event[], now: Date): BarDatum[] {
  const dayStarts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    return date;
  });
  const counts = new Map(dayStarts.map((date) => [date.toISOString(), 0]));
  const firstDay = dayStarts[0].getTime();

  for (const event of events) {
    const date = eventDate(event);
    if (!date || date.getTime() < firstDay || date.getTime() > now.getTime()) continue;
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString();
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return dayStarts.map((date) => ({
    key: date.toISOString(),
    label: dayLabel(date),
    value: counts.get(date.toISOString()) ?? 0,
  }));
}

function buildBars(events: readonly Event[], config: EventsBarChartConfig, now: Date): BarDatum[] {
  if (config.xAxis === "hours-24h") return getHourlyBars(events, now);
  if (config.xAxis === "days-7d") return getDailyBars(events, now);
  return getTagBars(events);
}

function axisTitle(xAxis: EventsBarChartXAxis) {
  if (xAxis === "hours-24h") return "Hours, last 24h";
  if (xAxis === "days-7d") return "Days, last 7d";
  return "Tags";
}

export function EventsBarChart({ config }: WidgetProps) {
  const safeConfig = useMemo(() => readConfig(config), [config]);
  const { data: events, error, isLoading } = useBattlelogEvents();
  const bars = useMemo(() => buildBars(events ?? [], safeConfig, new Date()), [events, safeConfig]);
  const maxValue = Math.max(1, ...bars.map((bar) => bar.value));

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-sm text-[var(--color-muted-foreground)]">
        Loading events...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-sm text-[var(--color-danger)]">
        Failed to load events: {String(error)}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-[var(--color-foreground)]">{axisTitle(safeConfig.xAxis)}</span>
        <span className="text-[var(--color-muted-foreground)]">Event count</span>
      </div>
      <div className="flex min-h-0 flex-1 items-end gap-2 overflow-x-auto border-b border-l border-[var(--color-border)] px-2 pt-2">
        {bars.map((bar) => {
          const height = `${Math.max(4, (bar.value / maxValue) * 100)}%`;
          return (
            <div key={bar.key} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold text-[var(--color-foreground)]">{bar.value}</span>
              <div
                className="w-full rounded-t bg-[var(--color-accent)]"
                style={{ height }}
                title={`${bar.label}: ${bar.value}`}
              />
              <span className="max-w-16 truncate text-[10px] text-[var(--color-muted-foreground)]" title={bar.label}>
                {bar.label}
              </span>
            </div>
          );
        })}
        {bars.length === 0 && (
          <div className="flex h-full flex-1 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
            No events to chart.
          </div>
        )}
      </div>
    </div>
  );
}

function EventsBarChartConfigPanel({ config, onChange }: ConfigPanelProps) {
  const safeConfig = readConfig(config);

  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="X-axis">
        <HTMLSelect
          fill
          value={safeConfig.xAxis}
          onChange={(event) => onChange({ ...safeConfig, xAxis: event.currentTarget.value })}
          options={[
            { label: "Tags", value: "tags" },
            { label: "Hours, last 24h", value: "hours-24h" },
            { label: "Days, last 7d", value: "days-7d" },
          ]}
        />
      </FormGroup>
      <FormGroup label="Y-axis">
        <HTMLSelect
          fill
          value={safeConfig.metric}
          disabled
          options={[{ label: "Event count", value: "event-count" }]}
        />
      </FormGroup>
    </div>
  );
}

export const eventsBarChartDescriptor: WidgetDescriptor = {
  type: "events-bar-chart",
  name: "Events Bar Chart",
  description: "Battlelog event counts grouped by tag, hour, or day",
  icon: <MdBarChart className="text-lg" />,
  defaultSize: { w: 5, h: 4, minW: 3, minH: 3 },
  defaultConfig: DEFAULT_CONFIG,
  component: EventsBarChart,
  configPanel: EventsBarChartConfigPanel,
  needsScroll: false,
};
