import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string | null; // "HH:mm" or null (all-day)
  endTime: string | null; // "HH:mm" or null
  notes: string;
  color: string;
  notify: boolean;
  notified: boolean;
}

export interface LayoutEvent {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
}

export type ViewMode = "auto" | "month" | "week" | "5day" | "3day" | "list";

export interface CalendarWidgetConfig {
  events: CalendarEvent[];
  upcomingDays: number;
  viewMode: ViewMode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EVENT_COLOR_PRESETS = [
  // Row 1: vivid
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  // Row 2: deeper / darker
  "#b91c1c",
  "#c2410c",
  "#a16207",
  "#15803d",
  "#0e7490",
  "#1d4ed8",
  "#6d28d9",
  "#be185d",
  // Row 3: muted / pastel
  "#f87171",
  "#fdba74",
  "#fde047",
  "#86efac",
  "#67e8f9",
  "#93c5fd",
  "#c4b5fd",
  "#f9a8d4",
  // Row 4: neutral
  "#64748b",
  "#475569",
  "#334155",
  "#1e293b",
];

export const DEFAULT_EVENT_COLOR = "#3b82f6";

export const DEFAULT_CALENDAR_CONFIG: CalendarWidgetConfig = {
  events: [],
  upcomingDays: 7,
  viewMode: "auto",
};

export const HOUR_HEIGHT_PX = 40;

// ---------------------------------------------------------------------------
// Config parsing
// ---------------------------------------------------------------------------

export function getCalendarConfig(config: Record<string, unknown>): CalendarWidgetConfig {
  const events = Array.isArray(config.events) ? (config.events as CalendarEvent[]) : [];
  const upcomingDays =
    typeof config.upcomingDays === "number" && config.upcomingDays > 0 ? config.upcomingDays : 7;
  const viewMode =
    typeof config.viewMode === "string" &&
    ["auto", "month", "week", "5day", "3day", "list"].includes(config.viewMode)
      ? (config.viewMode as ViewMode)
      : "auto";
  return { events, upcomingDays, viewMode };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatEventTime(time: string | null): string {
  if (!time) return "All day";
  const [h, m] = time.split(":");
  return `${Number.parseInt(h, 10)}.${m}`;
}

export function formatDateHeader(dateStr: string): string {
  return format(parseISO(dateStr), "EEEE, MMMM d");
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.min(23, Math.floor(total / 60));
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.min(23, Math.max(0, Math.floor(minutes / 60)));
  const m = Math.max(0, minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Adaptive view resolution
// ---------------------------------------------------------------------------

export type ResolvedView = "month" | "week" | "5day" | "3day" | "list";

export function getViewForSize(width: number, height: number, viewMode: ViewMode): ResolvedView {
  if (viewMode !== "auto") return viewMode as ResolvedView;
  if (width < 300) return "list";
  if (width > 500) return "week";
  if (height < 350) return "3day";
  return "month";
}

// ---------------------------------------------------------------------------
// Day ranges for views
// ---------------------------------------------------------------------------

export function getDaysInMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(start);
  return eachDayOfInterval({
    start: startOfWeek(start, { weekStartsOn: 1 }),
    end: endOfWeek(end, { weekStartsOn: 1 }),
  });
}

export function getDaysForView(view: ResolvedView, referenceDate: Date): Date[] {
  switch (view) {
    case "week": {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    case "5day": {
      return eachDayOfInterval({ start: referenceDate, end: addDays(referenceDate, 4) });
    }
    case "3day": {
      const start = subDays(referenceDate, 1);
      return eachDayOfInterval({ start, end: addDays(start, 2) });
    }
    default: {
      return [referenceDate];
    }
  }
}

export function getNavigationStep(view: ResolvedView): number {
  switch (view) {
    case "week": {
      return 7;
    }
    case "5day": {
      return 5;
    }
    case "3day": {
      return 3;
    }
    default: {
      return 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Event queries
// ---------------------------------------------------------------------------

export function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events
    .filter((e) => e.date === dateStr)
    .toSorted((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return -1;
      if (!b.time) return 1;
      return a.time.localeCompare(b.time);
    });
}

export function getEventsInRange(
  events: CalendarEvent[],
  startDate: string,
  endDate: string,
): CalendarEvent[] {
  return events.filter((e) => e.date >= startDate && e.date <= endDate);
}

export function getUpcomingEvents(events: CalendarEvent[], fromDate: string, days: number): CalendarEvent[] {
  const from = parseISO(fromDate);
  const to = addDays(from, days);
  return events
    .filter((e) => {
      const d = parseISO(e.date);
      return !isBefore(d, from) && isBefore(d, to);
    })
    .toSorted((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      if (!a.time && !b.time) return 0;
      if (!a.time) return -1;
      if (!b.time) return 1;
      return a.time.localeCompare(b.time);
    });
}

export function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    (groups[ev.date] ??= []).push(ev);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Event CRUD
// ---------------------------------------------------------------------------

export function createCalendarEvent(fields: Omit<CalendarEvent, "id">): CalendarEvent {
  return { id: generateId(), ...fields };
}

export function updateCalendarEvent(events: CalendarEvent[], updated: CalendarEvent): CalendarEvent[] {
  return events.map((e) => (e.id === updated.id ? updated : e));
}

export function deleteCalendarEvent(events: CalendarEvent[], id: string): CalendarEvent[] {
  return events.filter((e) => e.id !== id);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function getEventsDue(events: CalendarEvent[], now: Date): CalendarEvent[] {
  const nowMs = now.getTime();
  return events.filter((e) => {
    if (!e.notify || e.notified || !e.time) return false;
    const eventTime = new Date(`${e.date}T${e.time}`).getTime();
    return eventTime <= nowMs && nowMs - eventTime < 120_000;
  });
}

export function getEventsSoonDue(events: CalendarEvent[], now: Date, windowMinutes: number): CalendarEvent[] {
  const nowMs = now.getTime();
  const windowMs = windowMinutes * 60_000;
  return events.filter((e) => {
    if (!e.notify || e.notified || !e.time) return false;
    const eventTime = new Date(`${e.date}T${e.time}`).getTime();
    return eventTime > nowMs && eventTime - nowMs <= windowMs;
  });
}

export function markNotified(events: CalendarEvent[], id: string): CalendarEvent[] {
  return events.map((e) => (e.id === id ? { ...e, notified: true } : e));
}

// ---------------------------------------------------------------------------
// Time grid helpers for column view
// ---------------------------------------------------------------------------

export function eventTopPx(time: string, startHour: number): number {
  const [h, m] = time.split(":").map(Number);
  return (h - startHour) * HOUR_HEIGHT_PX + (m / 60) * HOUR_HEIGHT_PX;
}

export function eventHeightPx(startTime: string, endTime: string | null): number {
  if (!endTime) return 18;
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const durationMin = Math.max(endMin - startMin, 0);
  return Math.max((durationMin / 60) * HOUR_HEIGHT_PX, 18);
}

// ---------------------------------------------------------------------------
// Overlap layout — Google Calendar style
// ---------------------------------------------------------------------------

export function layoutOverlappingEvents(events: CalendarEvent[]): LayoutEvent[] {
  const timed = events
    .filter((e) => e.time)
    .toSorted((a, b) => {
      const cmp = a.time!.localeCompare(b.time!);
      if (cmp !== 0) return cmp;
      // Longer events first
      const aDur = a.endTime ? timeToMinutes(a.endTime) - timeToMinutes(a.time!) : 30;
      const bDur = b.endTime ? timeToMinutes(b.endTime) - timeToMinutes(b.time!) : 30;
      return bDur - aDur;
    });

  const result: LayoutEvent[] = [];
  // Track end times per column
  const columnEnds: number[] = [];

  for (const ev of timed) {
    const startMin = timeToMinutes(ev.time!);
    const endMin = ev.endTime ? timeToMinutes(ev.endTime) : startMin + 30;

    // Find first column where event fits (no overlap)
    let placed = -1;
    for (const [c, columnEnd] of columnEnds.entries()) {
      if (columnEnd <= startMin) {
        placed = c;
        break;
      }
    }
    if (placed === -1) {
      placed = columnEnds.length;
      columnEnds.push(0);
    }
    columnEnds[placed] = endMin;
    result.push({ event: ev, column: placed, totalColumns: 0 });
  }

  // Compute totalColumns per overlap group using a sweep
  // Group events that overlap transitively
  const groups: number[][] = [];
  const eventGroup: number[] = Array.from({ length: result.length }).fill(-1);

  for (let i = 0; i < result.length; i++) {
    const iStart = timeToMinutes(result[i].event.time!);
    const iEnd = result[i].event.endTime ? timeToMinutes(result[i].event.endTime!) : iStart + 30;

    for (let j = 0; j < i; j++) {
      const jStart = timeToMinutes(result[j].event.time!);
      const jEnd = result[j].event.endTime ? timeToMinutes(result[j].event.endTime!) : jStart + 30;

      if (iStart < jEnd && iEnd > jStart) {
        // Overlap — merge groups
        if (eventGroup[j] >= 0 && eventGroup[i] < 0) {
          eventGroup[i] = eventGroup[j];
          groups[eventGroup[j]].push(i);
        } else if (eventGroup[i] >= 0 && eventGroup[j] < 0) {
          eventGroup[j] = eventGroup[i];
          groups[eventGroup[i]].push(j);
        } else if (eventGroup[i] < 0 && eventGroup[j] < 0) {
          const g = groups.length;
          groups.push([j, i]);
          eventGroup[j] = g;
          eventGroup[i] = g;
        } else if (eventGroup[i] !== eventGroup[j]) {
          // Merge two groups
          const keep = eventGroup[j];
          const merge = eventGroup[i];
          for (const idx of groups[merge]) {
            eventGroup[idx] = keep;
            groups[keep].push(idx);
          }
          groups[merge] = [];
        }
      }
    }
    if (eventGroup[i] < 0) {
      eventGroup[i] = groups.length;
      groups.push([i]);
    }
  }

  // Set totalColumns per group
  for (const group of groups) {
    if (group.length === 0) continue;
    const maxCol = Math.max(...group.map((idx) => result[idx].column));
    for (const idx of group) {
      result[idx].totalColumns = maxCol + 1;
    }
  }

  // Single events get totalColumns = 1
  for (const r of result) {
    if (r.totalColumns === 0) r.totalColumns = 1;
  }

  return result;
}
