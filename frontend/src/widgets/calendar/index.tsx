import { Button, Checkbox, HTMLSelect, InputGroup, Popover, TextArea } from "@blueprintjs/core";
import { addDays, format, isToday, parseISO, subDays } from "date-fns";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { MdCalendarMonth } from "react-icons/md";

import { useDashboardStore } from "../../stores/dashboard-store";
import { useNotificationStore } from "../../notifications/notification-store";
import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import { WidgetActionBar } from "../WidgetActionBar";
import {
  addMinutesToTime,
  type CalendarEvent,
  createCalendarEvent,
  DEFAULT_CALENDAR_CONFIG,
  DEFAULT_EVENT_COLOR,
  deleteCalendarEvent,
  EVENT_COLOR_PRESETS,
  eventHeightPx,
  eventTopPx,
  formatDateHeader,
  formatEventTime,
  getCalendarConfig,
  getDaysForView,
  getDaysInMonth,
  getEventsDue,
  getEventsForDate,
  getEventsSoonDue,
  getNavigationStep,
  getUpcomingEvents,
  getViewForSize,
  groupByDate,
  HOUR_HEIGHT_PX,
  layoutOverlappingEvents,
  markNotified,
  minutesToTime,
  timeToMinutes,
  toDateStr,
  updateCalendarEvent,
} from "./calendar-model";

// ---------------------------------------------------------------------------
// useWidgetSize
// ---------------------------------------------------------------------------

function useWidgetSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

// ---------------------------------------------------------------------------
// Color picker
// ---------------------------------------------------------------------------

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Popover
      placement="bottom"
      content={
        <div className="grid grid-cols-8 gap-1.5 p-2">
          {EVENT_COLOR_PRESETS.map((preset) => (
            <button key={preset} type="button" aria-label={`Color ${preset}`} className="h-5 w-5 rounded-sm" style={{ backgroundColor: preset }} onClick={() => onChange(preset)} />
          ))}
        </div>
      }
    >
      <Button aria-label="Pick color" className="!min-h-0 !min-w-0" style={{ backgroundColor: value, height: 28, width: 36 }} />
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Detect if browser uses 12-hour time format (AM/PM)
// ---------------------------------------------------------------------------

const browserUses12Hour = (() => {
  const formatted = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2000, 0, 1, 20));
  return /am|pm/i.test(formatted);
})();

// ---------------------------------------------------------------------------
// Event form (add / edit) — now with endTime
// ---------------------------------------------------------------------------

type RepeatInterval = "daily" | "weekly";

function EventForm({
  initial,
  defaultDate,
  defaultTime,
  defaultEndTime,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: CalendarEvent;
  defaultDate: string;
  defaultTime?: string;
  defaultEndTime?: string;
  onSave: (events: CalendarEvent[]) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [time, setTime] = useState(initial?.time ?? defaultTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? defaultEndTime ?? (defaultTime ? addMinutesToTime(defaultTime, 30) : ""));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_EVENT_COLOR);
  const [notify, setNotify] = useState(initial?.notify ?? false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>("daily");

  const handleSave = () => {
    if (!title.trim()) return;
    if (initial) {
      const timeChanged = initial.time !== (time || null) || initial.date !== date;
      onSave([{
        ...initial, title: title.trim(), date, time: time || null,
        endTime: endTime || null, notes, color, notify,
        notified: timeChanged ? false : initial.notified,
      }]);
      return;
    }
    const events: CalendarEvent[] = [];
    const step = repeatInterval === "weekly" ? 7 : 1;
    const baseDate = new Date(date + "T00:00");
    for (let i = 0; i < repeatCount; i++) {
      const eventDate = addDays(baseDate, i * step);
      events.push(createCalendarEvent({
        title: title.trim(), date: toDateStr(eventDate),
        time: time || null, endTime: endTime || null,
        notes, color, notify, notified: false,
      }));
    }
    onSave(events);
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-foreground)]">
          {initial ? "Edit event" : "Create event"}
        </span>
        {initial && onDelete && (
          <Button minimal intent="danger" size="small" text="Delete" onClick={() => onDelete(initial.id)} />
        )}
      </div>

      <InputGroup placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <InputGroup type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="flex items-center gap-1">
        <InputGroup type="time" className="w-28" value={time} onChange={(e) => { const v = e.target.value; setTime(v); if (v) { const dur = endTime && time ? timeToMinutes(endTime) - timeToMinutes(time) : 30; setEndTime(addMinutesToTime(v, Math.max(dur, 15))); } }} />
        {time && <span className="text-xs text-[var(--color-muted-foreground)]">-</span>}
        {time && <InputGroup type="time" className="w-28" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
        {time && browserUses12Hour && <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatEventTime(time)}{endTime ? ` - ${formatEventTime(endTime)}` : ""}</span>}
        {time && <Button icon="cross" minimal size="small" onClick={() => { setTime(""); setEndTime(""); }} aria-label="Clear time" />}
      </div>
      <TextArea className="resize-none" fill rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {!initial && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted-foreground)]">Repeat</span>
          <InputGroup type="number" className="w-16" value={String(repeatCount)} onChange={(e) => setRepeatCount(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
          <span className="text-xs text-[var(--color-muted-foreground)]">times</span>
          <HTMLSelect value={repeatInterval} onChange={(e) => setRepeatInterval(e.target.value as RepeatInterval)} options={[{ value: "daily", label: "daily" }, { value: "weekly", label: "weekly" }]} className="text-xs" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ColorPicker value={color} onChange={setColor} />
          {time && <Checkbox checked={notify} onChange={() => setNotify(!notify)} label="Notify" className="!mb-0 text-xs" />}
        </div>
        <div className="flex gap-2">
          <Button minimal text="Cancel" onClick={onCancel} />
          <Button intent="primary" text={initial ? "Update" : repeatCount > 1 ? `Add ${repeatCount} events` : "Add"} onClick={handleSave} disabled={!title.trim()} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view — with day separators
// ---------------------------------------------------------------------------

function ListView({
  events,
  upcomingDays,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  upcomingDays: number;
  onSelectEvent: (ev: CalendarEvent) => void;
}) {
  const todayStr = toDateStr(new Date());
  const upcoming = getUpcomingEvents(events, todayStr, upcomingDays);

  if (upcoming.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <span className="text-sm text-[var(--color-muted-foreground)]">No upcoming events</span>
      </div>
    );
  }

  const grouped = groupByDate(upcoming);

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto p-2">
      {Object.entries(grouped).map(([dateStr, dayEvents]) => (
        <div key={dateStr}>
          <div className="flex items-center gap-2 px-1 py-1">
            <span className="whitespace-nowrap text-[10px] font-semibold text-[var(--color-foreground)]">
              {format(parseISO(dateStr), "EEE, MMM d")}
            </span>
            <div className="flex-1 border-t border-[var(--color-border)]" />
          </div>
          {dayEvents.map((ev) => (
            <button key={ev.id} type="button" onClick={() => onSelectEvent(ev)} className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-[var(--color-field)]">
              <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
              <span className="flex-1 truncate text-xs text-[var(--color-foreground)]">{ev.title}</span>
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {ev.time ? formatEventTime(ev.time) : "All day"}
                {ev.endTime ? ` - ${formatEventTime(ev.endTime)}` : ""}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month grid view — with Today button
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MonthGrid({
  year, month, events, upcomingDays,
  onPrevMonth, onNextMonth, onSelectDate, onToday,
}: {
  year: number; month: number; events: CalendarEvent[]; upcomingDays: number;
  onPrevMonth: () => void; onNextMonth: () => void;
  onSelectDate: (dateStr: string) => void; onToday: () => void;
}) {
  const days = getDaysInMonth(year, month);
  const current = new Date(year, month);
  const todayStr = toDateStr(new Date());
  const upcoming = getUpcomingEvents(events, todayStr, upcomingDays);

  return (
    <div className="flex h-full flex-col gap-1 p-2">
      <div className="flex items-center justify-between">
        <Button icon="chevron-left" minimal size="small" onClick={onPrevMonth} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-foreground)]">{format(current, "MMMM yyyy")}</span>
          <button type="button" onClick={onToday} className="text-xs underline text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">Today</button>
        </div>
        <Button icon="chevron-right" minimal size="small" onClick={onNextMonth} />
      </div>
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5 text-center text-[10px] font-medium uppercase text-[var(--color-muted-foreground)]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const sameMonth = day.getMonth() === month;
          const today = isToday(day);
          const dayEvents = events.filter((e) => e.date === dateStr);
          return (
            <button key={dateStr} type="button" onClick={() => onSelectDate(dateStr)} className={`flex flex-col items-center rounded px-0.5 py-1 text-xs transition-colors hover:bg-[var(--color-field)] ${!sameMonth ? "opacity-30" : ""} ${today ? "ring-1 ring-[var(--color-accent)]" : ""}`}>
              <span className={today ? "font-bold text-[var(--color-accent)]" : "text-[var(--color-foreground)]"}>{format(day, "d")}</span>
              {dayEvents.length > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (<span key={ev.id} className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ev.color }} />))}
                  {dayEvents.length > 3 && <span className="text-[8px] leading-none text-[var(--color-muted-foreground)]">+{dayEvents.length - 3}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {upcoming.length > 0 && (
        <div className="mt-1 flex-1 overflow-y-auto border-t border-[var(--color-border)] pt-1">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">Upcoming</div>
          {upcoming.map((ev) => (
            <button key={ev.id} type="button" onClick={() => onSelectDate(ev.date)} className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-[var(--color-field)]">
              <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
              <span className="flex-1 truncate text-xs text-[var(--color-foreground)]">{ev.title}</span>
              <span className="text-[10px] text-[var(--color-muted-foreground)]">{format(new Date(ev.date + "T00:00"), "MMM d")}{ev.time ? ` ${formatEventTime(ev.time)}` : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column day view — with drag-to-create, overlap layout, current time line
// ---------------------------------------------------------------------------

function ColumnDayView({
  days, events, compact,
  onSelectEvent, onAddEvent, onMoveEvent, onResizeEvent,
}: {
  days: Date[]; events: CalendarEvent[]; compact: boolean;
  onSelectEvent: (ev: CalendarEvent) => void;
  onAddEvent: (date: string, time?: string, endTime?: string) => void;
  onMoveEvent: (eventId: string, newDate: string, newTime: string) => void;
  onResizeEvent: (eventId: string, newEndTime: string) => void;
}) {
  const startStr = toDateStr(days[0]);
  const endStr = toDateStr(days[days.length - 1]);
  const rangeEvents = events.filter((e) => e.date >= startStr && e.date <= endStr);
  const allDayEvents = rangeEvents.filter((e) => !e.time);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Current time line — updates every minute
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNowTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();
  const nowPx = (nowMinutes / 60) * HOUR_HEIGHT_PX;
  const todayStr = toDateStr(nowTime);

  // Drag-to-create state
  const [drag, setDrag] = useState<{ dateStr: string; startMin: number; currentMin: number } | null>(null);
  // Drag-to-move event state
  const [moveDrag, setMoveDrag] = useState<{ eventId: string; originDateStr: string; currentDateStr: string; startMin: number; currentMin: number } | null>(null);
  // Drag-to-resize event state (bottom edge)
  const [resizeDrag, setResizeDrag] = useState<{ eventId: string; dateStr: string; startTimeMin: number; currentEndMin: number } | null>(null);
  // Track whether a drag actually happened (to distinguish click from drag/resize)
  const didDragMove = useRef(false);
  const didResize = useRef(false);

  const yToMinutes = (y: number) => {
    const totalHeight = 24 * HOUR_HEIGHT_PX;
    const fraction = Math.max(0, Math.min(1, y / totalHeight));
    return Math.round((fraction * 24 * 60) / 15) * 15;
  };

  if (compact) {
    return (
      <div className="flex h-full gap-px overflow-hidden">
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const dayEvents = getEventsForDate(events, dateStr);
          const today = isToday(day);
          return (
            <div key={dateStr} className={`flex flex-1 flex-col overflow-hidden ${today ? "bg-[var(--color-field)]" : ""}`}>
              <div className={`px-1 py-0.5 text-center text-[10px] font-medium ${today ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}>
                {format(day, "EEE")}<br />{format(day, "d")}
              </div>
              <div className="flex-1 overflow-y-auto px-0.5">
                {dayEvents.map((ev) => (
                  <button key={ev.id} type="button" onClick={() => onSelectEvent(ev)} className="mb-0.5 w-full truncate rounded px-1 py-0.5 text-left text-[10px] text-white" style={{ backgroundColor: ev.color }}>
                    {ev.time && <span className="mr-0.5 opacity-80">{formatEventTime(ev.time)}</span>}
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* All-day strip */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-[var(--color-border)]">
          <div className="w-10 flex-shrink-0" />
          {days.map((day) => {
            const dateStr = toDateStr(day);
            const dayAllDay = allDayEvents.filter((e) => e.date === dateStr);
            return (
              <div key={dateStr} className="flex-1 px-0.5 py-0.5">
                {dayAllDay.map((ev) => (
                  <button key={ev.id} type="button" onClick={() => onSelectEvent(ev)} className="mb-0.5 w-full truncate rounded px-1 py-0.5 text-[10px] text-white" style={{ backgroundColor: ev.color }}>{ev.title}</button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Day headers */}
      <div className="flex border-b border-[var(--color-border)]">
        <div className="w-10 flex-shrink-0" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div key={toDateStr(day)} className={`flex-1 py-1 text-center text-[10px] font-medium ${today ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}>
              {format(day, "EEE d")}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={(el) => {
        if (el && !el.dataset.scrolled) {
          el.dataset.scrolled = "1";
          const scrollTo = Math.max(0, nowPx - el.clientHeight / 2);
          el.scrollTop = scrollTo;
        }
      }} className="relative flex flex-1 overflow-y-auto">
        {/* Full-width hour lines (behind everything) */}
        <div className="pointer-events-none absolute inset-0 z-0">
          {hours.map((h) => (
            <div key={h} className="border-b border-[var(--color-border)]" style={{ height: `${HOUR_HEIGHT_PX}px` }} />
          ))}
        </div>

        {/* Time gutter */}
        <div className="relative z-[1] w-10 flex-shrink-0">
          {hours.map((h) => (
            <div key={h} className="pr-1 text-right text-[9px] text-[var(--color-muted-foreground)]" style={{ height: `${HOUR_HEIGHT_PX}px` }}>
              {h}.00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const dayTimed = rangeEvents.filter((e) => e.time && e.date === dateStr);
          const today = dateStr === todayStr;
          const laid = layoutOverlappingEvents(dayTimed);

          return (
            <div
              key={dateStr}
              className={`relative z-[1] flex-1 border-l border-[var(--color-border)] ${today ? "bg-[var(--color-field)]/30" : ""}`}
              style={{ minHeight: `${24 * HOUR_HEIGHT_PX}px`, cursor: resizeDrag ? "ns-resize" : moveDrag ? "move" : "crosshair", userSelect: "none" }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const min = yToMinutes(y);
                setDrag({ dateStr, startMin: min, currentMin: min });
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const min = yToMinutes(y);
                if (resizeDrag) {
                  const endMin = Math.max(resizeDrag.startTimeMin + 15, min);
                  setResizeDrag({ ...resizeDrag, currentEndMin: endMin });
                } else if (moveDrag) {
                  if (min !== moveDrag.startMin || dateStr !== moveDrag.originDateStr) didDragMove.current = true;
                  setMoveDrag({ ...moveDrag, currentDateStr: dateStr, currentMin: min });
                } else if (drag && drag.dateStr === dateStr) {
                  setDrag({ ...drag, currentMin: min });
                }
              }}
              onMouseUp={() => {
                if (resizeDrag) {
                  onResizeEvent(resizeDrag.eventId, minutesToTime(resizeDrag.currentEndMin));
                  setResizeDrag(null);
                  didResize.current = true;
                  setTimeout(() => { didResize.current = false; }, 0);
                  return;
                }
                if (moveDrag) {
                  if (didDragMove.current) {
                    onMoveEvent(moveDrag.eventId, moveDrag.currentDateStr, minutesToTime(moveDrag.currentMin));
                  }
                  setMoveDrag(null);
                  setTimeout(() => { didDragMove.current = false; }, 0);
                  return;
                }
                if (!drag || drag.dateStr !== dateStr) return;
                const minStart = Math.min(drag.startMin, drag.currentMin);
                const minEnd = Math.max(drag.startMin, drag.currentMin);
                const duration = minEnd - minStart;
                if (duration >= 15) {
                  onAddEvent(dateStr, minutesToTime(minStart), minutesToTime(minEnd));
                } else {
                  onAddEvent(dateStr, minutesToTime(minStart), minutesToTime(minStart + 30));
                }
                setDrag(null);
              }}
              onMouseLeave={() => { if (drag?.dateStr === dateStr) setDrag(null); }}
            >

              {/* Drag preview */}
              {drag && drag.dateStr === dateStr && (
                <div
                  className="pointer-events-none absolute left-0.5 right-0.5 z-10 rounded bg-[var(--color-accent)]/30 border border-[var(--color-accent)]"
                  style={{
                    top: `${(Math.min(drag.startMin, drag.currentMin) / 60) * HOUR_HEIGHT_PX}px`,
                    height: `${Math.max((Math.abs(drag.currentMin - drag.startMin) / 60) * HOUR_HEIGHT_PX, 4)}px`,
                  }}
                />
              )}

              {/* Current time line */}
              {today && (
                <div className="pointer-events-none absolute left-0 right-0 z-10" style={{ top: `${nowPx}px` }}>
                  <div className="border-t-2 border-[var(--color-success)]" />
                  <div className="absolute -left-1.5 -top-[5px] h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
                </div>
              )}

              {/* Events — overlap layout */}
              {laid.map(({ event: ev, column, totalColumns }) => {
                const topPx = eventTopPx(ev.time!, 0);
                const baseHeight = eventHeightPx(ev.time!, ev.endTime);
                const isResizing = resizeDrag?.eventId === ev.id;
                const isMoving = moveDrag?.eventId === ev.id;
                const displayHeight = isResizing
                  ? Math.max(((resizeDrag.currentEndMin - resizeDrag.startTimeMin) / 60) * HOUR_HEIGHT_PX, 15)
                  : baseHeight;
                const displayTop = isMoving && didDragMove.current && moveDrag.currentDateStr === dateStr
                  ? (moveDrag.currentMin / 60) * HOUR_HEIGHT_PX
                  : topPx;
                const widthPct = 100 / totalColumns;
                const leftPct = column * widthPct;
                return (
                  <div
                    key={ev.id}
                    className="absolute z-[5] overflow-hidden rounded text-[10px] text-white"
                    style={{
                      backgroundColor: ev.color,
                      top: `${displayTop}px`,
                      height: `${displayHeight}px`,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      cursor: isMoving ? "move" : "pointer",
                      opacity: isMoving && didDragMove.current && moveDrag.currentDateStr !== dateStr ? 0.3
                        : isMoving && didDragMove.current ? 0.7
                        : isMoving && !didDragMove.current ? 0.85
                        : isResizing ? 0.7 : 1,
                    }}
                    onClick={() => { if (!didDragMove.current && !didResize.current) onSelectEvent(ev); }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      didDragMove.current = false;
                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const min = yToMinutes(y);
                      setMoveDrag({ eventId: ev.id, originDateStr: dateStr, currentDateStr: dateStr, startMin: min, currentMin: min });
                    }}
                  >
                    <div className="truncate px-1 py-0.5">
                      <span className="mr-0.5 opacity-80">{formatEventTime(ev.time)}</span>
                      {ev.title}
                    </div>
                    {/* Resize handle — bottom 8px */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2"
                      style={{ cursor: "ns-resize" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startTimeMin = timeToMinutes(ev.time!);
                        const currentEndMin = ev.endTime
                          ? timeToMinutes(ev.endTime)
                          : startTimeMin + 30;
                        setResizeDrag({ eventId: ev.id, dateStr, startTimeMin, currentEndMin });
                      }}
                    />
                  </div>
                );
              })}

              {/* Ghost preview when dragging event to this column from another day */}
              {moveDrag && moveDrag.currentDateStr === dateStr && moveDrag.originDateStr !== dateStr && (() => {
                const srcEvent = events.find((e) => e.id === moveDrag.eventId);
                if (!srcEvent?.time) return null;
                const ghostHeight = eventHeightPx(srcEvent.time, srcEvent.endTime);
                return (
                  <div
                    className="pointer-events-none absolute left-0.5 right-0.5 z-10 truncate rounded border border-dashed border-[var(--color-accent)] bg-[var(--color-accent)]/20 px-1 py-0.5 text-[10px] text-[var(--color-accent)]"
                    style={{ top: `${(moveDrag.currentMin / 60) * HOUR_HEIGHT_PX}px`, height: `${ghostHeight}px` }}
                  >
                    {srcEvent.title}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day detail view
// ---------------------------------------------------------------------------

function DayDetail({
  dateStr, events, onBack, onSaveEvent, onDeleteEvent,
}: {
  dateStr: string; events: CalendarEvent[];
  onBack: () => void; onSaveEvent: (events: CalendarEvent[]) => void; onDeleteEvent: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const dayEvents = getEventsForDate(events, dateStr);

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        <Button icon="arrow-left" minimal size="small" onClick={onBack} />
        <span className="text-sm font-semibold text-[var(--color-foreground)]">{formatDateHeader(dateStr)}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {dayEvents.length === 0 && !adding && <div className="py-4 text-center text-sm text-[var(--color-muted-foreground)]">No events</div>}
        {dayEvents.map((ev) =>
          editingId === ev.id ? (
            <EventForm key={ev.id} initial={ev} defaultDate={dateStr} onSave={(evs) => { onSaveEvent(evs); setEditingId(null); }} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={ev.id} className="group flex items-start gap-2 rounded px-2 py-1.5 hover:bg-[var(--color-field)]">
              <span className="mt-1 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-[var(--color-foreground)]">{ev.title}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {formatEventTime(ev.time)}
                    {ev.endTime ? ` - ${formatEventTime(ev.endTime)}` : ""}
                  </span>
                  {ev.notify && <span className="text-[10px] text-[var(--color-warning)]">bell</span>}
                </div>
                {ev.notes && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">{ev.notes}</p>}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button icon="edit" minimal size="small" onClick={() => setEditingId(ev.id)} />
                <Button icon="cross" minimal size="small" className="hover:text-[var(--color-danger)]" onClick={() => onDeleteEvent(ev.id)} />
              </div>
            </div>
          ),
        )}
        {adding && <EventForm defaultDate={dateStr} onSave={(evs) => { onSaveEvent(evs); setAdding(false); }} onCancel={() => setAdding(false)} />}
      </div>
      {!adding && editingId === null && <Button icon="plus" text="Add event" small fill onClick={() => setAdding(true)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

function CalendarWidget({ instanceId, config: rawConfig, isEditMode }: WidgetProps) {
  const persistPatchedWidgetConfigNow = useDashboardStore((s) => s.persistPatchedWidgetConfigNow);
  const activeDashboardId = useDashboardStore((s) => s.activeDashboard?.id ?? null);
  const deliverOrQueue = useNotificationStore((s) => s.deliverOrQueue);
  const config = getCalendarConfig(rawConfig);

  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useWidgetSize(containerRef);
  const resolvedView = getViewForSize(width, height, config.viewMode);

  const now = new Date();
  const [refDate, setRefDate] = useState(now);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [addDefaults, setAddDefaults] = useState<{ date: string; time?: string; endTime?: string }>({ date: toDateStr(now) });

  // Notification check
  const [alertEvents, setAlertEvents] = useState<{ ev: CalendarEvent; addedAt: number }[]>([]);
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    const hasNotifiable = config.events.some((e) => e.notify && !e.notified && e.time);
    if (!hasNotifiable) return;
    const check = () => {
      const nowCheck = new Date();
      const due = getEventsDue(config.events, nowCheck);
      for (const ev of due) {
        if (activeDashboardId) {
          deliverOrQueue({ dashboardId: activeDashboardId, sourceType: "calendar", sourceId: instanceId, title: ev.title, body: `Calendar event: ${formatEventTime(ev.time)}`, dueAt: `${ev.date}T${ev.time}` });
        }
        persistPatchedWidgetConfigNow(instanceId, { events: markNotified(config.events, ev.id) });
        setAlertEvents((prev) => prev.some((a) => a.ev.id === ev.id) ? prev : [...prev, { ev, addedAt: Date.now() }]);
      }
      const soon = getEventsSoonDue(config.events, nowCheck, 5);
      setAlertEvents((prev) => {
        const nowMs = Date.now();
        const n = soon.filter((s) => !prev.some((a) => a.ev.id === s.id));
        return n.length > 0 ? [...prev, ...n.map((s) => ({ ev: s, addedAt: nowMs }))] : prev;
      });
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [config.events, activeDashboardId, instanceId]);

  const dismissAlert = (id: string) => {
    setAlertEvents((prev) => prev.filter((a) => a.ev.id !== id));
    setEscalated(false);
  };

  // Escalate after 30s if any alert is unconfirmed
  useEffect(() => {
    if (alertEvents.length === 0) { setEscalated(false); return; }
    const oldest = Math.min(...alertEvents.map((a) => a.addedAt));
    const elapsed = Date.now() - oldest;
    if (elapsed >= 30_000) { setEscalated(true); return; }
    const timer = setTimeout(() => setEscalated(true), 30_000 - elapsed);
    return () => clearTimeout(timer);
  }, [alertEvents]);

  const persistEvents = useCallback(
    (events: CalendarEvent[]) => { persistPatchedWidgetConfigNow(instanceId, { events }); },
    [instanceId, persistPatchedWidgetConfigNow],
  );

  const handleSaveEvent = useCallback(
    (newEvents: CalendarEvent[]) => {
      let events = config.events;
      for (const ev of newEvents) {
        const existing = events.find((e) => e.id === ev.id);
        events = existing ? updateCalendarEvent(events, ev) : [...events, ev];
      }
      persistEvents(events);
      setAdding(false);
      setEditingEvent(null);
    },
    [config.events, persistEvents],
  );

  const handleDeleteEvent = useCallback(
    (id: string) => persistEvents(deleteCalendarEvent(config.events, id)),
    [config.events, persistEvents],
  );

  const step = getNavigationStep(resolvedView);
  const navigateBack = () => {
    if (resolvedView === "month") { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }
    else setRefDate(subDays(refDate, step));
  };
  const navigateForward = () => {
    if (resolvedView === "month") { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }
    else setRefDate(addDays(refDate, step));
  };
  const navigateToday = () => { const t = new Date(); setRefDate(t); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); };

  // Form overlay
  if (adding || editingEvent) {
    return (
      <div ref={containerRef} className="flex h-full flex-col">
        <EventForm
          initial={editingEvent ?? undefined}
          defaultDate={addDefaults.date}
          defaultTime={addDefaults.time}
          defaultEndTime={addDefaults.endTime}
          onSave={handleSaveEvent}
          onCancel={() => { setAdding(false); setEditingEvent(null); }}
          onDelete={editingEvent ? (id) => { handleDeleteEvent(id); setEditingEvent(null); } : undefined}
        />
      </div>
    );
  }

  // Day detail from month grid
  if (selectedDate && resolvedView === "month") {
    return (
      <div ref={containerRef} className="h-full">
        <DayDetail dateStr={selectedDate} events={config.events} onBack={() => setSelectedDate(null)} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} />
      </div>
    );
  }

  const isColumnView = resolvedView === "week" || resolvedView === "5day" || resolvedView === "3day";
  const columnDays = isColumnView ? getDaysForView(resolvedView, refDate) : [];

  return (
    <div ref={containerRef} className="relative flex h-full flex-col" style={escalated ? { boxShadow: "inset 0 0 0 3px var(--color-accent)", animation: "border-pulse 1.5s ease-in-out infinite" } : undefined}>
      {/* Alert bar */}
      {alertEvents.length > 0 && (
        <div className={`border-b border-[var(--color-accent)] ${escalated ? "bg-[var(--color-accent)]/30" : "animate-pulse bg-[var(--color-accent)]/20"}`}>
          {alertEvents.map(({ ev }) => (
            <div key={ev.id} className="flex items-center gap-2 px-2 py-1">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
              <span className="flex-1 truncate text-xs font-medium text-[var(--color-foreground)]">{ev.title} {ev.time ? `- ${formatEventTime(ev.time)}` : ""}</span>
              <Button size="small" text="Confirm" onClick={() => dismissAlert(ev.id)} className="text-[10px]" />
            </div>
          ))}
        </div>
      )}

      {/* Navigation header for column views */}
      {isColumnView && (
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-2 py-1">
          <Button icon="chevron-left" minimal size="small" onClick={navigateBack} />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-foreground)]">
              {format(columnDays[0], "MMM d")} - {format(columnDays[columnDays.length - 1], "MMM d, yyyy")}
            </span>
            <button type="button" onClick={navigateToday} className="text-xs underline text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">Today</button>
          </div>
          <Button icon="chevron-right" minimal size="small" onClick={navigateForward} />
        </div>
      )}

      {/* Main view */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {resolvedView === "list" && <ListView events={config.events} upcomingDays={config.upcomingDays} onSelectEvent={(ev) => setEditingEvent(ev)} />}
        {resolvedView === "month" && (
          <MonthGrid year={viewYear} month={viewMonth} events={config.events} upcomingDays={config.upcomingDays} onPrevMonth={navigateBack} onNextMonth={navigateForward} onSelectDate={setSelectedDate} onToday={navigateToday} />
        )}
        {isColumnView && (
          <ColumnDayView
            days={columnDays} events={config.events} compact={width < 400}
            onSelectEvent={(ev) => setEditingEvent(ev)}
            onAddEvent={(date, time, endTime) => { setAddDefaults({ date, time, endTime }); setAdding(true); }}
            onMoveEvent={(eventId, newDate, newTime) => {
              const ev = config.events.find((e) => e.id === eventId);
              if (!ev || !ev.time) return;
              const duration = ev.endTime
                ? timeToMinutes(ev.endTime) - timeToMinutes(ev.time)
                : 30;
              const newEndTime = addMinutesToTime(newTime, Math.max(duration, 15));
              persistEvents(updateCalendarEvent(config.events, { ...ev, date: newDate, time: newTime, endTime: newEndTime, notified: false }));
            }}
            onResizeEvent={(eventId, newEndTime) => {
              const ev = config.events.find((e) => e.id === eventId);
              if (!ev) return;
              persistEvents(updateCalendarEvent(config.events, { ...ev, endTime: newEndTime }));
            }}
          />
        )}
      </div>

      <WidgetActionBar
        primary={<Button text="Add event" icon="plus" small fill disabled={isEditMode} onClick={() => { setAddDefaults({ date: toDateStr(new Date()) }); setAdding(true); }} />}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config panel
// ---------------------------------------------------------------------------

function CalendarConfigPanel({ config: rawConfig, onChange }: ConfigPanelProps) {
  const cfg = getCalendarConfig(rawConfig);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">View mode</label>
        <HTMLSelect fill value={cfg.viewMode} onChange={(e) => onChange({ ...rawConfig, viewMode: e.target.value })} options={[
          { value: "auto", label: "Auto (adapt to size)" }, { value: "month", label: "Month" },
          { value: "week", label: "Week (7 days)" }, { value: "5day", label: "5 days" },
          { value: "3day", label: "3 days" }, { value: "list", label: "List" },
        ]} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Upcoming events (days ahead)</label>
        <InputGroup type="number" value={String(cfg.upcomingDays)} onChange={(e) => onChange({ ...rawConfig, upcomingDays: Math.max(1, Number(e.target.value) || 7) })} />
      </div>
      {cfg.events.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-[var(--color-muted-foreground)]">All events ({cfg.events.length})</div>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {cfg.events.slice().sort((a, b) => a.date.localeCompare(b.date)).map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 rounded border border-[var(--color-border)] px-2 py-1">
                <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                <span className="flex-1 truncate text-xs">{ev.title}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">{ev.date}</span>
                {ev.notify && <span className="text-[10px] text-[var(--color-warning)]">N</span>}
                <Button icon="cross" minimal size="small" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]" onClick={() => onChange({ ...rawConfig, events: deleteCalendarEvent(cfg.events, ev.id) })} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

export const calendarDescriptor: WidgetDescriptor = {
  type: "calendar",
  name: "Calendar",
  description: "Adaptive calendar with week/day/month views and event notifications",
  icon: <MdCalendarMonth className="text-lg" />,
  defaultSize: { w: 5, h: 5, minW: 3, minH: 3 },
  defaultConfig: DEFAULT_CALENDAR_CONFIG as unknown as Record<string, unknown>,
  component: CalendarWidget,
  configPanel: CalendarConfigPanel,
  toClipboardConfig: (config) => {
    const cfg = getCalendarConfig(config);
    return {
      ...config,
      events: cfg.events.map((e) => ({ ...e, notified: false })),
    };
  },
  needsScroll: true,
};
