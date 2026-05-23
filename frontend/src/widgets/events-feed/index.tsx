import { FormGroup, HTMLSelect, Switch } from "@blueprintjs/core";
import { useMemo } from "react";
import useSWR from "swr";

import { battlelogDataSource } from "../../data-sources/battlelog";
import { useWidgetParams } from "../../hooks/use-widget-params";
import type { ConfigPanelProps, Event, WidgetDescriptor, WidgetProps } from "../../types";

interface EventsFeedConfig {
  autoScroll: boolean;
  maxItems: 50 | 100 | 200;
}

const DEFAULT_CONFIG: Record<string, unknown> & EventsFeedConfig = {
  autoScroll: true,
  maxItems: 100,
};

function readConfig(config: Record<string, unknown>): EventsFeedConfig {
  const maxItems = [50, 100, 200].includes(Number(config.maxItems))
    ? (Number(config.maxItems) as EventsFeedConfig["maxItems"])
    : DEFAULT_CONFIG.maxItems;

  return {
    autoScroll: typeof config.autoScroll === "boolean" ? config.autoScroll : DEFAULT_CONFIG.autoScroll,
    maxItems,
  };
}

function eventTimestamp(event: Event): number {
  const timestamp = battlelogDataSource.getTimestamp?.(event);
  const time = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function summarizeEvent(event: Event): string {
  return event.notes || event.link || event.location || "No summary";
}

function sortEventsByTimestamp(events: readonly Event[]): Event[] {
  const sorted: Event[] = [];
  for (const event of events) {
    const timestamp = eventTimestamp(event);
    const insertAt = sorted.findIndex((candidate) => eventTimestamp(candidate) > timestamp);
    if (insertAt === -1) {
      sorted.push(event);
    } else {
      sorted.splice(insertAt, 0, event);
    }
  }

  return sorted;
}

function EventsFeedWidget({ config, isEditMode }: WidgetProps) {
  const safeConfig = readConfig(config);
  const { selectedItem, time, setSelectedItem } = useWidgetParams();
  const {
    data: events,
    error,
    isLoading,
  } = useSWR(battlelogDataSource.listKey, battlelogDataSource.listFetcher, { refreshInterval: 10_000 });

  const focusTime = time ? new Date(time).getTime() : Number.NaN;
  const rows = useMemo(
    () => sortEventsByTimestamp(events ?? []).slice(-safeConfig.maxItems),
    [events, safeConfig.maxItems],
  );

  const timeFocusId = useMemo(() => {
    if (!Number.isFinite(focusTime)) return null;
    let focused: Event | null = null;
    for (const event of rows) {
      if (eventTimestamp(event) <= focusTime) {
        focused = event;
      }
    }
    return focused ? battlelogDataSource.getItemId(focused) : null;
  }, [focusTime, rows]);

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
    <div className="flex h-full flex-col overflow-hidden text-xs text-[var(--color-foreground)]">
      {time && (
        <div className="border-b border-[var(--color-separator)] px-3 py-1 text-[var(--color-muted-foreground)]">
          Time focus: {time}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="flex flex-col gap-1">
          {rows.map((event) => {
            const id = battlelogDataSource.getItemId(event);
            const isSelected = selectedItem === id;
            const isTimeFocused = timeFocusId === id;
            return (
              <button
                key={id}
                type="button"
                disabled={isEditMode}
                className={`rounded border border-[var(--color-separator)] px-2 py-1 text-left transition-colors ${
                  isSelected ? "border-[var(--color-accent)] bg-[var(--color-surface-secondary)]" : ""
                } ${isTimeFocused ? "border-dashed border-[var(--color-muted-foreground)]" : ""} ${
                  isEditMode ? "cursor-default opacity-80" : "hover:bg-[var(--color-surface-secondary)]"
                }`}
                onClick={() => setSelectedItem(id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{event.header || "Untitled event"}</span>
                  <span className="shrink-0 text-[var(--color-muted-foreground)]">
                    {event.event_time || "—"}
                  </span>
                </div>
                <div className="line-clamp-2 text-[var(--color-muted-foreground)]">
                  {event.source ? `${event.source}: ` : ""}
                  {summarizeEvent(event)}
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className="p-3 text-center text-[var(--color-muted-foreground)]">
              No Battlelog events found.
            </div>
          )}
        </div>
      </div>
      {safeConfig.autoScroll && (
        <div className="border-t border-[var(--color-separator)] px-3 py-1 text-[var(--color-muted-foreground)]">
          Showing latest {safeConfig.maxItems}
        </div>
      )}
    </div>
  );
}

function EventsFeedConfigPanel({ config, onChange }: ConfigPanelProps) {
  const safeConfig = readConfig(config);

  return (
    <div className="flex flex-col gap-3">
      <Switch
        checked={safeConfig.autoScroll}
        label="Auto-scroll to latest"
        onChange={(event) => onChange({ ...safeConfig, autoScroll: event.currentTarget.checked })}
      />
      <FormGroup label="Max items">
        <HTMLSelect
          fill
          value={safeConfig.maxItems}
          onChange={(event) => onChange({ ...safeConfig, maxItems: Number(event.currentTarget.value) })}
          options={[
            { label: "50", value: 50 },
            { label: "100", value: 100 },
            { label: "200", value: 200 },
          ]}
        />
      </FormGroup>
    </div>
  );
}

export const eventsFeedDescriptor: WidgetDescriptor = {
  type: "events-feed",
  name: "Events Feed",
  description: "Chronological Battlelog event feed driven by selectedItem and time",
  icon: <span className="text-lg">☰</span>,
  defaultSize: { w: 6, h: 5, minW: 4, minH: 3 },
  defaultConfig: DEFAULT_CONFIG,
  component: EventsFeedWidget,
  configPanel: EventsFeedConfigPanel,
  needsScroll: false,
};
