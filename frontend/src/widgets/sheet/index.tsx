import { Button, InputGroup } from "@blueprintjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdTableChart } from "react-icons/md";

import { useDashboardStore } from "../../stores/dashboard-store";
import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import { WidgetActionBar } from "../WidgetActionBar";
import {
  addRow,
  columnIndexToLetter,
  columnKeyToLetter,
  computeSheet,
  DEFAULT_SHEET_CONFIG,
  deleteColumn,
  deleteColumns,
  deleteRow,
  deleteRows,
  getCellFormat,
  getNextCell,
  getSheetConfig,
  insertColumnAt,
  insertRowAt,
  parsePastedData,
  type SheetConfig,
  toggleCellFormat,
  updateCell,
} from "./sheet-model";

const DEFAULT_COL_W = 150;
type Direction = "right" | "left" | "down" | "up";

function arrowKeyToDirection(key: string): Direction | null {
  switch (key) {
    case "ArrowUp": {
      return "up";
    }
    case "ArrowDown": {
      return "down";
    }
    case "ArrowLeft": {
      return "left";
    }
    case "ArrowRight": {
      return "right";
    }
    default: {
      return null;
    }
  }
}

function getCellStateClass({
  isFormulaReference,
  isSelected,
  inRange,
}: {
  isFormulaReference: boolean;
  isSelected: boolean;
  inRange: boolean;
}) {
  if (isFormulaReference) {
    return "outline outline-2 -outline-offset-2 outline-[var(--color-success)]";
  }
  if (isSelected) {
    return "outline outline-2 -outline-offset-2 outline-[var(--color-accent)]";
  }
  if (inRange) {
    return "bg-[var(--color-accent)]/10";
  }
  return "";
}

function getCellTextClass(isError: boolean, raw: string) {
  if (isError) {
    return "text-[var(--color-danger)]";
  }
  if (raw.startsWith("=")) {
    return "text-[var(--color-foreground)]";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Add rows bar
// ---------------------------------------------------------------------------

function AddRowsBar({ disabled, onAdd }: { disabled: boolean; onAdd: (count: number) => void }) {
  const [count, setCount] = useState(10);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-muted-foreground)]">Add</span>
      <InputGroup
        className="w-14"
        type="number"
        value={String(count)}
        onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
        disabled={disabled}
      />
      <span className="text-xs text-[var(--color-muted-foreground)]">rows</span>
      <Button small text="Add" disabled={disabled} onClick={() => onAdd(count)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet widget
// ---------------------------------------------------------------------------

interface CellRef {
  colKey: string;
  rowId: string;
}

function SheetWidget({ instanceId, config: rawConfig, isEditMode }: WidgetProps) {
  const persistPatchedWidgetConfigNow = useDashboardStore((s) => s.persistPatchedWidgetConfigNow);
  const cfg = getSheetConfig(rawConfig);
  const { columns, rows } = cfg;

  const computed = useMemo(() => computeSheet(columns, rows), [columns, rows]);

  const [selectedCell, setSelectedCell] = useState<CellRef | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<CellRef | null>(null);
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [editValue, setEditValue] = useState("");
  const [formulaRefCell, setFormulaRefCell] = useState<CellRef | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    rowIdx: number;
    colIdx: number;
    target: "cell" | "row-header" | "col-header";
  } | null>(null);
  const [colResize, setColResize] = useState<{ colIdx: number; startX: number; startWidth: number } | null>(
    null,
  );
  const [isDraggingSelect, setIsDraggingSelect] = useState(false);
  const [clipboardText, setClipboardText] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Selection range
  const selRange = useMemo(() => {
    if (!selectedCell) return null;
    if (!selectionAnchor) {
      const ci = columns.findIndex((c) => c.key === selectedCell.colKey);
      const ri = rows.findIndex((r) => r.id === selectedCell.rowId);
      return { colStart: ci, colEnd: ci, rowStart: ri, rowEnd: ri };
    }
    const c1 = columns.findIndex((c) => c.key === selectedCell.colKey);
    const c2 = columns.findIndex((c) => c.key === selectionAnchor.colKey);
    const r1 = rows.findIndex((r) => r.id === selectedCell.rowId);
    const r2 = rows.findIndex((r) => r.id === selectionAnchor.rowId);
    return {
      colStart: Math.min(c1, c2),
      colEnd: Math.max(c1, c2),
      rowStart: Math.min(r1, r2),
      rowEnd: Math.max(r1, r2),
    };
  }, [selectedCell, selectionAnchor, columns, rows]);

  const isCellInRange = useCallback(
    (colKey: string, rowId: string) => {
      if (!selRange) return false;
      const ci = columns.findIndex((c) => c.key === colKey);
      const ri = rows.findIndex((r) => r.id === rowId);
      return (
        ci >= selRange.colStart && ci <= selRange.colEnd && ri >= selRange.rowStart && ri <= selRange.rowEnd
      );
    },
    [selRange, columns, rows],
  );

  const isMultiSelect = selectionAnchor !== null;

  const persist = useCallback(
    (patch: Partial<SheetConfig>) => {
      persistPatchedWidgetConfigNow(instanceId, patch);
    },
    [instanceId, persistPatchedWidgetConfigNow],
  );

  useEffect(() => {
    if (editingCell) inputRef.current?.focus();
  }, [editingCell]);
  useEffect(() => {
    if (!isDraggingSelect) return;
    const stop = () => setIsDraggingSelect(false);
    globalThis.addEventListener("mouseup", stop);
    return () => globalThis.removeEventListener("mouseup", stop);
  }, [isDraggingSelect]);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    persist({ rows: updateCell(rows, editingCell.rowId, editingCell.colKey, editValue) });
    setEditingCell(null);
    setTimeout(() => tableRef.current?.focus(), 0);
  }, [editingCell, editValue, rows, persist]);

  const startEdit = (colKey: string, rowId: string, initialValue?: string) => {
    const raw = rows.find((r) => r.id === rowId)?.cells[colKey] ?? "";
    setEditingCell({ colKey, rowId });
    setEditValue(initialValue ?? raw);
    setSelectedCell({ colKey, rowId });
  };

  const navigate = (dir: Direction) => {
    if (!selectedCell) return;
    const next = getNextCell(columns, rows, selectedCell.colKey, selectedCell.rowId, dir);
    if (next) {
      setSelectedCell(next);
      setEditingCell(null);
    }
  };

  const isFormulaMode = editingCell && editValue.startsWith("=");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) {
      switch (e.key) {
        case "Enter": {
          e.preventDefault();
          setFormulaRefCell(null);
          commitEdit();
          if (selectedCell) navigate("down");
          break;
        }
        case "Tab": {
          e.preventDefault();
          setFormulaRefCell(null);
          commitEdit();
          navigate(e.shiftKey ? "left" : "right");
          break;
        }
        case "Escape": {
          e.preventDefault();
          setFormulaRefCell(null);
          setEditingCell(null);
          break;
        }
        default: {
          if (isFormulaMode && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            const from = formulaRefCell ?? editingCell;
            const dir = arrowKeyToDirection(e.key);
            if (!dir) return;
            const next = getNextCell(columns, rows, from.colKey, from.rowId, dir);
            if (next) {
              const refStr = `${columnKeyToLetter(columns, next.colKey)}${rows.findIndex((r) => r.id === next.rowId) + 1}`;
              setFormulaRefCell(next);
              if (formulaRefCell) {
                const lastRef = `${columnKeyToLetter(columns, formulaRefCell.colKey)}${rows.findIndex((r) => r.id === formulaRefCell.rowId) + 1}`;
                const idx = editValue.lastIndexOf(lastRef);
                if (idx === -1) {
                  setEditValue(editValue + refStr);
                } else {
                  setEditValue(editValue.slice(0, idx) + refStr + editValue.slice(idx + lastRef.length));
                }
              } else setEditValue(editValue + refStr);
            }
          }
        }
      }
      return;
    }
    if (!selectedCell) return;
    if (e.key === "Tab") {
      e.preventDefault();
      setSelectionAnchor(null);
      navigate(e.shiftKey ? "left" : "right");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      setSelectionAnchor(null);
      startEdit(selectedCell.colKey, selectedCell.rowId);
      return;
    }
    if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const dir = arrowKeyToDirection(e.key);
      if (!dir) return;
      if (e.shiftKey) {
        if (!selectionAnchor) setSelectionAnchor(selectedCell);
        const next = getNextCell(columns, rows, selectedCell.colKey, selectedCell.rowId, dir);
        if (next) {
          setSelectedCell(next);
          setEditingCell(null);
        }
      } else {
        setSelectionAnchor(null);
        navigate(dir);
      }
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (selRange) {
        let newRows = [...rows];
        for (let ri = selRange.rowStart; ri <= selRange.rowEnd; ri++)
          for (let ci = selRange.colStart; ci <= selRange.colEnd; ci++)
            newRows = updateCell(newRows, rows[ri].id, columns[ci].key, "");
        persist({ rows: newRows });
      }
      return;
    }
    // Copy selection (Ctrl+C)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selRange) {
      e.preventDefault();
      const lines: string[] = [];
      for (let ri = selRange.rowStart; ri <= selRange.rowEnd; ri++) {
        const cells: string[] = [];
        for (let ci = selRange.colStart; ci <= selRange.colEnd; ci++) {
          cells.push(rows[ri].cells[columns[ci].key] ?? "");
        }
        lines.push(cells.join("\t"));
      }
      const text = lines.join("\n");
      setClipboardText(text);
      navigator.clipboard?.writeText(text).catch(() => {});
      return;
    }
    // Bold/Italic/Underline (Ctrl+B/I/U)
    if ((e.ctrlKey || e.metaKey) && ["b", "i", "u"].includes(e.key.toLowerCase()) && selRange) {
      e.preventDefault();
      const prop = e.key.toLowerCase() as "b" | "i" | "u";
      const cells: Array<{ rowId: string; colKey: string }> = [];
      for (let ri = selRange.rowStart; ri <= selRange.rowEnd; ri++)
        for (let ci = selRange.colStart; ci <= selRange.colEnd; ci++)
          cells.push({ rowId: rows[ri].id, colKey: columns[ci].key });
      persist({ formats: toggleCellFormat(cfg.formats, cells, prop) });
      return;
    }
    // Paste (Ctrl+V handled by onPaste)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      startEdit(selectedCell.colKey, selectedCell.rowId, e.key);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!selectedCell) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const ci = columns.findIndex((c) => c.key === selectedCell.colKey);
    const ri = rows.findIndex((r) => r.id === selectedCell.rowId);
    if (ci === -1 || ri === -1) return;
    persist({ rows: parsePastedData(text, columns, rows, ci, ri).rows });
  };

  const selectedRaw = selectedCell
    ? (rows.find((r) => r.id === selectedCell.rowId)?.cells[selectedCell.colKey] ?? "")
    : "";
  const selectedRef = selectedCell
    ? `${columnKeyToLetter(columns, selectedCell.colKey)}${rows.findIndex((r) => r.id === selectedCell.rowId) + 1}`
    : "";
  const selectedFmt = selectedCell ? getCellFormat(cfg.formats, selectedCell.rowId, selectedCell.colKey) : {};

  const toggleFormat = (prop: "b" | "i" | "u") => {
    if (!selRange) return;
    const cells: Array<{ rowId: string; colKey: string }> = [];
    for (let ri = selRange.rowStart; ri <= selRange.rowEnd; ri++)
      for (let ci = selRange.colStart; ci <= selRange.colEnd; ci++)
        cells.push({ rowId: rows[ri].id, colKey: columns[ci].key });
    persist({ formats: toggleCellFormat(cfg.formats, cells, prop) });
  };

  return (
    <div
      className="flex h-full flex-col"
      ref={tableRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      style={isDraggingSelect ? { userSelect: "none" } : undefined}
      onMouseMove={(e) => {
        if (colResize) {
          const delta = e.clientX - colResize.startX;
          persist({
            columns: columns.map((c, i) =>
              i === colResize.colIdx ? { ...c, width: Math.max(40, colResize.startWidth + delta) } : c,
            ),
          });
        }
      }}
      onMouseUp={() => {
        if (colResize) setColResize(null);
      }}
      onMouseLeave={() => {
        if (colResize) setColResize(null);
      }}
    >
      {/* Sheet name */}
      {cfg.name && (
        <div className="shrink-0 border-b border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
          {cfg.name}
        </div>
      )}
      {/* Formula bar + formatting buttons */}
      {selectedCell && (
        <div className="flex h-6 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-2">
          <span className="w-8 text-center text-[10px] font-semibold text-[var(--color-muted-foreground)]">
            {selectedRef}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-foreground)]">
            {editingCell ? editValue : selectedRaw}
          </span>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              className={`h-5 w-5 rounded text-[10px] font-bold ${selectedFmt.b ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-field)]"}`}
              onClick={() => toggleFormat("b")}
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              className={`h-5 w-5 rounded text-[10px] italic ${selectedFmt.i ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-field)]"}`}
              onClick={() => toggleFormat("i")}
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              className={`h-5 w-5 rounded text-[10px] underline ${selectedFmt.u ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-field)]"}`}
              onClick={() => toggleFormat("u")}
              title="Underline (Ctrl+U)"
            >
              U
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr className="sticky top-0 z-10">
              <th
                className="w-8 cursor-default border-b border-r border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-center text-[9px] text-[var(--color-muted-foreground)]"
                style={{ position: "sticky", left: 0, zIndex: 20 }}
              />
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className="cursor-default border-b border-r border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-center text-[9px] font-bold text-[var(--color-muted-foreground)]"
                  style={{ width: col.width ?? DEFAULT_COL_W, minWidth: 60 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (rows.length === 0) return;
                    if (e.shiftKey && selectionAnchor)
                      setSelectedCell({ colKey: col.key, rowId: rows.at(-1).id });
                    else {
                      setSelectionAnchor({ colKey: col.key, rowId: rows[0].id });
                      setSelectedCell({ colKey: col.key, rowId: rows.at(-1).id });
                    }
                    tableRef.current?.focus();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCtxMenu({
                      x: e.clientX - (tableRef.current?.getBoundingClientRect().left ?? 0),
                      y: e.clientY - (tableRef.current?.getBoundingClientRect().top ?? 0),
                      rowIdx: 0,
                      colIdx: i,
                      target: "col-header",
                    });
                  }}
                >
                  <div className="relative">
                    {columnIndexToLetter(i)}
                    <div
                      className="absolute -right-2 top-0 bottom-0 w-3 cursor-col-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setColResize({
                          colIdx: i,
                          startX: e.clientX,
                          startWidth: col.width ?? DEFAULT_COL_W,
                        });
                      }}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.id} className={rowIdx % 2 === 1 ? "bg-[var(--color-surface-secondary)]" : ""}>
                <td
                  className="w-8 cursor-default border-b border-r border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-1 text-center text-[9px] text-[var(--color-muted-foreground)]"
                  style={{ position: "sticky", left: 0, zIndex: 5 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (columns.length === 0) return;
                    if (e.shiftKey && selectionAnchor)
                      setSelectedCell({ colKey: columns.at(-1).key, rowId: row.id });
                    else {
                      setSelectionAnchor({ colKey: columns[0].key, rowId: row.id });
                      setSelectedCell({ colKey: columns.at(-1).key, rowId: row.id });
                    }
                    tableRef.current?.focus();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCtxMenu({
                      x: e.clientX - (tableRef.current?.getBoundingClientRect().left ?? 0),
                      y: e.clientY - (tableRef.current?.getBoundingClientRect().top ?? 0),
                      rowIdx,
                      colIdx: 0,
                      target: "row-header",
                    });
                  }}
                >
                  {rowIdx + 1}
                </td>
                {columns.map((col, colIdx) => {
                  const isSelected = selectedCell?.colKey === col.key && selectedCell?.rowId === row.id;
                  const inRange = isMultiSelect && isCellInRange(col.key, row.id);
                  const isEditing = editingCell?.colKey === col.key && editingCell?.rowId === row.id;
                  const isFormRef = formulaRefCell?.colKey === col.key && formulaRefCell?.rowId === row.id;
                  const display = computed[row.id]?.[col.key] ?? "";
                  const raw = row.cells[col.key] ?? "";
                  const isError = display.startsWith("#");
                  const fmt = getCellFormat(cfg.formats, row.id, col.key);
                  const fmtClass = `${fmt.b ? "font-bold" : ""} ${fmt.i ? "italic" : ""} ${fmt.u ? "underline" : ""}`;
                  const textClass = getCellTextClass(isError, raw);
                  const cellStateClass = getCellStateClass({
                    isFormulaReference: isFormRef,
                    isSelected,
                    inRange,
                  });

                  return (
                    <td
                      key={col.key}
                      className={`relative overflow-hidden border-b border-r border-[var(--color-border)] px-0 py-0 ${cellStateClass}`}
                      style={{ width: col.width ?? DEFAULT_COL_W, minWidth: 60 }}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        if (editingCell && !isEditing) commitEdit();
                        if (e.shiftKey && selectedCell) {
                          if (!selectionAnchor) setSelectionAnchor(selectedCell);
                          setSelectedCell({ colKey: col.key, rowId: row.id });
                        } else {
                          setSelectionAnchor({ colKey: col.key, rowId: row.id });
                          setSelectedCell({ colKey: col.key, rowId: row.id });
                          setIsDraggingSelect(true);
                        }
                        tableRef.current?.focus();
                      }}
                      onMouseEnter={() => {
                        if (isDraggingSelect) setSelectedCell({ colKey: col.key, rowId: row.id });
                      }}
                      onDoubleClick={() => startEdit(col.key, row.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCtxMenu({
                          x: e.clientX - (tableRef.current?.getBoundingClientRect().left ?? 0),
                          y: e.clientY - (tableRef.current?.getBoundingClientRect().top ?? 0),
                          rowIdx,
                          colIdx,
                          target: "cell",
                        });
                      }}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          className="box-border h-full w-full border-none bg-transparent px-2 py-1 text-xs outline-none ring-2 ring-inset ring-[var(--color-accent)]"
                          style={{ maxWidth: "100%" }}
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            setFormulaRefCell(null);
                          }}
                          onBlur={commitEdit}
                        />
                      ) : (
                        <div className={`truncate px-2 py-1 ${fmtClass} ${textClass}`}>{display}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
          />
          <div
            className="absolute z-50 min-w-[160px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
            style={{
              left: Math.min(ctxMenu.x, (tableRef.current?.clientWidth ?? 300) - 170),
              top: Math.min(ctxMenu.y, (tableRef.current?.clientHeight ?? 300) - 200),
            }}
          >
            {/* Copy / Paste */}
            <button
              type="button"
              className={`w-full px-3 py-1 text-left text-xs ${selRange && (selRange.rowEnd > selRange.rowStart || selRange.colEnd > selRange.colStart || selectedCell) ? "hover:bg-[var(--color-field)]" : "text-[var(--color-muted-foreground)] cursor-default"}`}
              disabled={!selectedCell}
              onClick={() => {
                if (!selRange) return;
                const lines: string[] = [];
                for (let ri = selRange.rowStart; ri <= selRange.rowEnd; ri++) {
                  const cells: string[] = [];
                  for (let ci = selRange.colStart; ci <= selRange.colEnd; ci++)
                    cells.push(rows[ri].cells[columns[ci].key] ?? "");
                  lines.push(cells.join("\t"));
                }
                const text = lines.join("\n");
                setClipboardText(text);
                navigator.clipboard?.writeText(text).catch(() => {});
                setCtxMenu(null);
              }}
            >
              Copy
            </button>
            <button
              type="button"
              className={`w-full px-3 py-1 text-left text-xs ${clipboardText ? "hover:bg-[var(--color-field)]" : "text-[var(--color-muted-foreground)] cursor-default"}`}
              disabled={!clipboardText}
              onClick={() => {
                if (!clipboardText || !selectedCell) return;
                const ci = columns.findIndex((c) => c.key === selectedCell.colKey);
                const ri = rows.findIndex((r) => r.id === selectedCell.rowId);
                if (ci !== -1 && ri !== -1)
                  persist({ rows: parsePastedData(clipboardText, columns, rows, ci, ri).rows });
                setCtxMenu(null);
              }}
            >
              Paste
            </button>
            <div className="my-1 border-t border-[var(--color-border)]" />
            {(ctxMenu.target === "cell" || ctxMenu.target === "row-header") && (
              <>
                <button
                  type="button"
                  className="w-full px-3 py-1 text-left text-xs hover:bg-[var(--color-field)]"
                  onClick={() => {
                    persist(insertRowAt(cfg, ctxMenu.rowIdx));
                    setCtxMenu(null);
                  }}
                >
                  Insert row above
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1 text-left text-xs hover:bg-[var(--color-field)]"
                  onClick={() => {
                    persist(insertRowAt(cfg, ctxMenu.rowIdx + 1));
                    setCtxMenu(null);
                  }}
                >
                  Insert row below
                </button>
                {selRange && selRange.rowEnd > selRange.rowStart && (
                  <button
                    type="button"
                    className="w-full px-3 py-1 text-left text-xs hover:bg-[var(--color-field)]"
                    onClick={() => {
                      persist(insertRowAt(cfg, ctxMenu.rowIdx, selRange.rowEnd - selRange.rowStart + 1));
                      setCtxMenu(null);
                    }}
                  >
                    Insert {selRange.rowEnd - selRange.rowStart + 1} rows
                  </button>
                )}
                <button
                  type="button"
                  className="w-full px-3 py-1 text-left text-xs text-[var(--color-danger)] hover:bg-[var(--color-field)]"
                  onClick={() => {
                    if (selRange && selRange.rowEnd > selRange.rowStart)
                      persist(
                        deleteRows(
                          cfg,
                          rows.slice(selRange.rowStart, selRange.rowEnd + 1).map((r) => r.id),
                        ),
                      );
                    else persist(deleteRow(cfg, rows[ctxMenu.rowIdx].id));
                    setCtxMenu(null);
                  }}
                >
                  {selRange && selRange.rowEnd > selRange.rowStart
                    ? `Delete ${selRange.rowEnd - selRange.rowStart + 1} rows`
                    : "Delete row"}
                </button>
              </>
            )}
            {(ctxMenu.target === "cell" || ctxMenu.target === "col-header") && (
              <>
                {ctxMenu.target === "cell" && <div className="my-1 border-t border-[var(--color-border)]" />}
                <button
                  type="button"
                  className="w-full px-3 py-1 text-left text-xs hover:bg-[var(--color-field)]"
                  onClick={() => {
                    persist(insertColumnAt(cfg, ctxMenu.colIdx));
                    setCtxMenu(null);
                  }}
                >
                  Insert column left
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1 text-left text-xs hover:bg-[var(--color-field)]"
                  onClick={() => {
                    persist(insertColumnAt(cfg, ctxMenu.colIdx + 1));
                    setCtxMenu(null);
                  }}
                >
                  Insert column right
                </button>
                {selRange && selRange.colEnd > selRange.colStart && (
                  <button
                    type="button"
                    className="w-full px-3 py-1 text-left text-xs hover:bg-[var(--color-field)]"
                    onClick={() => {
                      persist(insertColumnAt(cfg, ctxMenu.colIdx, selRange.colEnd - selRange.colStart + 1));
                      setCtxMenu(null);
                    }}
                  >
                    Insert {selRange.colEnd - selRange.colStart + 1} columns
                  </button>
                )}
                <button
                  type="button"
                  className="w-full px-3 py-1 text-left text-xs text-[var(--color-danger)] hover:bg-[var(--color-field)]"
                  onClick={() => {
                    if (selRange && selRange.colEnd > selRange.colStart)
                      persist(
                        deleteColumns(
                          cfg,
                          columns.slice(selRange.colStart, selRange.colEnd + 1).map((c) => c.key),
                        ),
                      );
                    else persist(deleteColumn(cfg, columns[ctxMenu.colIdx].key));
                    setCtxMenu(null);
                  }}
                >
                  {selRange && selRange.colEnd > selRange.colStart
                    ? `Delete ${selRange.colEnd - selRange.colStart + 1} columns`
                    : "Delete column"}
                </button>
              </>
            )}
          </div>
        </>
      )}

      <WidgetActionBar
        primary={
          <AddRowsBar
            disabled={isEditMode}
            onAdd={(n) => {
              let c = cfg;
              for (let i = 0; i < n; i++) c = addRow(c);
              persist(c);
            }}
          />
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config panel
// ---------------------------------------------------------------------------

function SheetConfigPanel({ config: rawConfig, onChange }: ConfigPanelProps) {
  const cfg = getSheetConfig(rawConfig);
  const update = (patch: Partial<SheetConfig>) => {
    onChange({ ...rawConfig, ...patch });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-1 text-xs font-medium text-[var(--color-muted-foreground)]">Name</div>
        <InputGroup
          value={cfg.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Sheet name"
        />
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-[var(--color-muted-foreground)]">Data</div>
        <div className="text-[10px] text-[var(--color-muted-foreground)]">
          {cfg.columns.length} columns, {cfg.rows.length} rows
        </div>
        <Button
          intent="danger"
          minimal
          small
          text="Clear all data"
          className="mt-1"
          onClick={() =>
            update({
              rows: cfg.rows.map((r) => ({
                ...r,
                cells: Object.fromEntries(cfg.columns.map((c) => [c.key, ""])),
              })),
            })
          }
        />
      </div>

      {/* Formula reference — Google Sheets style */}
      <div>
        <div className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">Functions</div>
        <div className="flex flex-col gap-2 text-[10px]">
          {[
            { name: "SUM", syntax: "SUM(A1:A10)", desc: "Adds all values in a range" },
            { name: "AVERAGE", syntax: "AVERAGE(A1:A10)", desc: "Calculates the mean of a range" },
            { name: "COUNT", syntax: "COUNT(A1:A10)", desc: "Counts non-empty cells in a range" },
            { name: "MIN", syntax: "MIN(A1:A10)", desc: "Returns the smallest value" },
            { name: "MAX", syntax: "MAX(A1:A10)", desc: "Returns the largest value" },
            { name: "PRODUCT", syntax: "PRODUCT(A1:A10)", desc: "Multiplies all values in a range" },
          ].map((f) => (
            <div key={f.name} className="rounded border border-[var(--color-border)] px-2 py-1.5">
              <div className="font-mono font-bold text-[var(--color-accent)]">={f.syntax}</div>
              <div className="mt-0.5 text-[var(--color-muted-foreground)]">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">Operators</div>
        <div className="flex flex-col gap-2 text-[10px]">
          <div className="rounded border border-[var(--color-border)] px-2 py-1.5">
            <div className="font-mono font-bold text-[var(--color-accent)]">=A1+B1-C1</div>
            <div className="mt-0.5 text-[var(--color-muted-foreground)]">Add, subtract ( + - )</div>
          </div>
          <div className="rounded border border-[var(--color-border)] px-2 py-1.5">
            <div className="font-mono font-bold text-[var(--color-accent)]">=A1*B1/C1</div>
            <div className="mt-0.5 text-[var(--color-muted-foreground)]">Multiply, divide ( * / )</div>
          </div>
          <div className="rounded border border-[var(--color-border)] px-2 py-1.5">
            <div className="font-mono font-bold text-[var(--color-accent)]">=A1*2</div>
            <div className="mt-0.5 text-[var(--color-muted-foreground)]">Use constants in expressions</div>
          </div>
        </div>

        <div className="mt-3 mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">Tips</div>
        <div className="flex flex-col gap-1 text-[10px] text-[var(--color-muted-foreground)]">
          <div>
            Type <span className="font-mono font-bold text-[var(--color-foreground)]">=</span> to start a
            formula
          </div>
          <div>
            Use arrow keys after <span className="font-mono font-bold text-[var(--color-foreground)]">=</span>{" "}
            to select cells
          </div>
          <div>Ctrl+B / I / U for bold, italic, underline</div>
          <div>Right-click for insert/delete rows and columns</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

export const sheetDescriptor: WidgetDescriptor = {
  type: "sheet",
  name: "Sheet",
  description: "Editable spreadsheet with formulas, keyboard navigation, and paste support",
  icon: <MdTableChart className="text-lg" />,
  defaultSize: { w: 8, h: 6, minW: 4, minH: 3 },
  defaultConfig: DEFAULT_SHEET_CONFIG as unknown as Record<string, unknown>,
  component: SheetWidget,
  configPanel: SheetConfigPanel,
  needsScroll: true,
};
