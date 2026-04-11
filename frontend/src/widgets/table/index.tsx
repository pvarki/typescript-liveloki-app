import { Button, Checkbox, InputGroup } from "@blueprintjs/core";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { MdLink } from "react-icons/md";
import { Link } from "react-router-dom";

import {
  BATTLELOG_TABLE_COLUMNS,
  DEFAULT_VISIBLE_BATTLELOG_COLUMNS,
  eventToTableRow,
  useBattlelogEvents,
} from "../../battlelog/event-data";
import { useEventDetailStore } from "../../battlelog/event-detail-store";
import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";

function getVisibleColumns(config: Record<string, unknown>) {
  const configured = config.visibleColumns;
  if (!Array.isArray(configured)) return DEFAULT_VISIBLE_BATTLELOG_COLUMNS;

  const known = new Set(BATTLELOG_TABLE_COLUMNS.map((column) => column.key));
  const visible = configured.filter((column): column is string => typeof column === "string" && known.has(column));
  return visible.length > 0 ? visible : DEFAULT_VISIBLE_BATTLELOG_COLUMNS;
}

function HighlightedCell({ text, indices }: { text: string; indices?: ReadonlyArray<[number, number]> }) {
  if (!indices || indices.length === 0) return <>{text || "—"}</>;

  const parts: React.ReactNode[] = [];
  let previous = 0;
  for (const [start, end] of indices) {
    if (start > previous) parts.push(text.slice(previous, start));
    parts.push(
      <mark key={`${start}-${end}`} className="rounded-sm bg-amber-300/60 px-0.5 text-inherit dark:bg-amber-500/50">
        {text.slice(start, end + 1)}
      </mark>,
    );
    previous = end + 1;
  }
  if (previous < text.length) parts.push(text.slice(previous));
  return <>{parts}</>;
}

function TableWidget({ config }: WidgetProps) {
  const { data: events, error, isLoading } = useBattlelogEvents();
  const openEvent = useEventDetailStore((state) => state.openEvent);
  const [search, setSearch] = useState("");
  const visibleColumnKeys = getVisibleColumns(config);
  const visibleColumns = BATTLELOG_TABLE_COLUMNS.filter((column) => visibleColumnKeys.includes(column.key));

  const rows = useMemo(() => (events ?? []).map(eventToTableRow), [events]);
  const fuse = useMemo(
    () =>
      new Fuse(rows, {
        keys: visibleColumns.map((column) => `cells.${column.key}`),
        threshold: 0.3,
        ignoreLocation: true,
        includeMatches: true,
      }),
    [rows, visibleColumns],
  );

  const searchResults = useMemo(() => (search.trim() ? fuse.search(search) : null), [fuse, search]);
  const displayRows = searchResults ? searchResults.map((result) => result.item) : rows;

  const matchMap = useMemo(() => {
    const map = new Map<string, Map<string, ReadonlyArray<[number, number]>>>();
    if (!searchResults) return map;

    for (const result of searchResults) {
      const cellMap = new Map<string, ReadonlyArray<[number, number]>>();
      for (const match of result.matches ?? []) {
        if (match.key?.startsWith("cells.") && match.indices) {
          cellMap.set(match.key.replace("cells.", ""), match.indices as ReadonlyArray<[number, number]>);
        }
      }
      map.set(result.item.id, cellMap);
    }
    return map;
  }, [searchResults]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-3 text-sm text-[var(--color-muted-foreground)]">Loading events...</div>;
  }

  if (error) {
    return <div className="flex h-full items-center justify-center p-3 text-sm text-[var(--color-danger)]">Failed to load events: {String(error)}</div>;
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-3">
      <InputGroup leftIcon="search" placeholder="Search Battlelog events..." value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 font-semibold text-[var(--color-muted-foreground)]">Detail</th>
              {visibleColumns.map((column) => (
                <th key={column.key} className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 font-semibold text-[var(--color-muted-foreground)]">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => {
              const cellMatches = matchMap.get(row.id);
              return (
                <tr key={row.id} className={`border-b border-[var(--color-border)] last:border-b-0 ${index % 2 === 1 ? "bg-[var(--color-surface-secondary)]" : ""}`}>
                  <td className="px-2 py-1.5 align-top">
                    <Link
                      to={`/event/${row.event.id}`}
                      className="inline-flex rounded p-1 text-[var(--color-accent)] hover:bg-[var(--color-surface-secondary)]"
                      aria-label={`Open ${row.cells.header || "event"}`}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                        event.preventDefault();
                        openEvent(row.event.id);
                      }}
                    >
                      <MdLink />
                    </Link>
                  </td>
                  {visibleColumns.map((column) => (
                    <td key={column.key} className="max-w-56 px-2 py-1.5 align-top">
                      <span className="line-clamp-3 whitespace-pre-wrap break-words">
                        <HighlightedCell text={row.cells[column.key] || "—"} indices={cellMatches?.get(column.key)} />
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-2 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
                  {search.trim() ? `No events match "${search}"` : "No Battlelog events found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableConfigPanel({ config, onChange }: ConfigPanelProps) {
  const visibleColumns = new Set(getVisibleColumns(config));

  const setColumn = (key: string, visible: boolean) => {
    const next = new Set(visibleColumns);
    if (visible) next.add(key);
    else next.delete(key);
    onChange({ ...config, visibleColumns: [...next] });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--color-muted-foreground)]">Choose Battlelog event columns shown in this table.</p>
      <div className="flex flex-col gap-1">
        {BATTLELOG_TABLE_COLUMNS.map((column) => (
          <Checkbox key={column.key} checked={visibleColumns.has(column.key)} label={column.label} onChange={(event) => setColumn(column.key, event.currentTarget.checked)} />
        ))}
      </div>
      <div className="flex gap-2">
        <Button small onClick={() => onChange({ ...config, visibleColumns: DEFAULT_VISIBLE_BATTLELOG_COLUMNS })}>All</Button>
        <Button small onClick={() => onChange({ ...config, visibleColumns: ["header", "event_time", "location"] })}>Operational</Button>
      </div>
    </div>
  );
}

export const tableDescriptor: WidgetDescriptor = {
  type: "table",
  name: "Table",
  description: "Battlelog event table with Fuse search",
  icon: <span className="text-lg">▦</span>,
  defaultSize: { w: 8, h: 5, minW: 5, minH: 4 },
  defaultConfig: { mode: "battlelog", visibleColumns: DEFAULT_VISIBLE_BATTLELOG_COLUMNS },
  component: TableWidget,
  configPanel: TableConfigPanel,
  needsScroll: true,
};
