// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SheetColumn {
  key: string;
  label: string;
  width?: number;
}

export interface SheetRow {
  id: string;
  cells: Record<string, string>; // colKey → raw value (may start with "=" for formula)
}

export interface CellFormat {
  b?: boolean; // bold
  i?: boolean; // italic
  u?: boolean; // underline
}

export interface SheetConfig {
  name: string;
  columns: SheetColumn[];
  rows: SheetRow[];
  formats?: Record<string, CellFormat>; // key: "rowId:colKey"
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createDefaultColumns(count: number): SheetColumn[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `col_${generateId()}`,
    label: columnIndexToLetter(i),
  }));
}

export function createEmptyRow(columns: SheetColumn[]): SheetRow {
  return {
    id: generateId(),
    cells: Object.fromEntries(columns.map((c) => [c.key, ""])),
  };
}

export function createEmptyRows(columns: SheetColumn[], count: number): SheetRow[] {
  return Array.from({ length: count }, () => createEmptyRow(columns));
}

const DEFAULT_COLUMNS = createDefaultColumns(5);

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  name: "Sheet",
  columns: DEFAULT_COLUMNS,
  rows: createEmptyRows(DEFAULT_COLUMNS, 10),
};

// ---------------------------------------------------------------------------
// Config parsing
// ---------------------------------------------------------------------------

export function getSheetConfig(config: Record<string, unknown>): SheetConfig {
  const columns = Array.isArray(config.columns)
    ? (config.columns as SheetColumn[]).filter(
        (c) => typeof c.key === "string" && typeof c.label === "string",
      )
    : DEFAULT_SHEET_CONFIG.columns;
  const rows = Array.isArray(config.rows)
    ? (config.rows as SheetRow[]).filter(
        (r) => typeof r.id === "string" && r.cells && typeof r.cells === "object",
      )
    : DEFAULT_SHEET_CONFIG.rows;
  const name = typeof config.name === "string" ? config.name : "Sheet";
  const formats =
    config.formats && typeof config.formats === "object"
      ? (config.formats as Record<string, CellFormat>)
      : undefined;
  return { name, columns, rows, formats };
}

export function formatKey(rowId: string, colKey: string): string {
  return `${rowId}:${colKey}`;
}

export function getCellFormat(
  formats: Record<string, CellFormat> | undefined,
  rowId: string,
  colKey: string,
): CellFormat {
  return formats?.[formatKey(rowId, colKey)] ?? {};
}

export function toggleCellFormat(
  formats: Record<string, CellFormat> | undefined,
  cells: Array<{ rowId: string; colKey: string }>,
  prop: "b" | "i" | "u",
): Record<string, CellFormat> {
  const result = { ...formats };
  // If all selected cells have the property, turn it off; otherwise turn it on
  const allHave = cells.every((c) => result[formatKey(c.rowId, c.colKey)]?.[prop]);
  for (const c of cells) {
    const key = formatKey(c.rowId, c.colKey);
    const existing = result[key] ?? {};
    const next = { ...existing, [prop]: !allHave || undefined };
    // Clean up empty format entries
    if (!next.b && !next.i && !next.u) delete result[key];
    else result[key] = next;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Column letter addressing: A, B, ... Z, AA, AB, ...
// ---------------------------------------------------------------------------

export function columnIndexToLetter(index: number): string {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCodePoint(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

export function letterToColumnIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + ((letter.codePointAt(i) ?? 64) - 64);
  }
  return result - 1;
}

export function columnKeyToLetter(columns: SheetColumn[], key: string): string {
  const idx = columns.findIndex((c) => c.key === key);
  return idx === -1 ? "?" : columnIndexToLetter(idx);
}

// ---------------------------------------------------------------------------
// Cell reference parsing: "B3" → { col: 1, row: 2 }
// ---------------------------------------------------------------------------

const CELL_REF_RE = /^([A-Z]+)(\d+)$/;

export function parseCellRef(ref: string): { col: number; row: number } | null {
  const m = ref.toUpperCase().match(CELL_REF_RE);
  if (!m) return null;
  return { col: letterToColumnIndex(m[1]), row: Number.parseInt(m[2], 10) - 1 };
}

function parseRange(range: string): { col: number; startRow: number; endRow: number } | null {
  const [startRef, endRef] = range.split(":");
  if (!startRef || !endRef) return null;
  const start = parseCellRef(startRef.trim());
  const end = parseCellRef(endRef.trim());
  if (!start || !end) return null;
  // Single-column range
  if (start.col !== end.col) return null;
  return {
    col: start.col,
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
  };
}

// ---------------------------------------------------------------------------
// Formula engine
// ---------------------------------------------------------------------------

type CellGetter = (col: number, row: number) => number | null;

function resolveRange(range: string, get: CellGetter): number[] {
  const parsed = parseRange(range);
  if (!parsed) return [];
  const values: number[] = [];
  for (let r = parsed.startRow; r <= parsed.endRow; r++) {
    const v = get(parsed.col, r);
    if (v !== null) values.push(v);
  }
  return values;
}

const FUNC_RE = /^(SUM|AVERAGE|AVG|COUNT|MIN|MAX|PRODUCT)\((.+)\)$/i;
const SIMPLE_REF_RE = /^[A-Z]+\d+$/i;

function evaluateFormula(formula: string, get: CellGetter, evaluating: Set<string>): number | string {
  const expr = formula.slice(1).trim(); // remove "="

  // Function call: =SUM(A1:A5)
  const funcMatch = expr.match(FUNC_RE);
  if (funcMatch) {
    const func = funcMatch[1].toUpperCase();
    const arg = funcMatch[2].trim();
    const values = resolveRange(arg, get);
    switch (func) {
      case "SUM": {
        return values.reduce((a, b) => a + b, 0);
      }
      case "AVERAGE":
      case "AVG": {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      }
      case "COUNT": {
        return values.length;
      }
      case "MIN": {
        return values.length > 0 ? Math.min(...values) : 0;
      }
      case "MAX": {
        return values.length > 0 ? Math.max(...values) : 0;
      }
      case "PRODUCT": {
        return values.length > 0 ? values.reduce((a, b) => a * b, 1) : 0;
      }
      default: {
        return "#ERR!";
      }
    }
  }

  // Simple cell reference: =A1
  if (SIMPLE_REF_RE.test(expr)) {
    const ref = parseCellRef(expr);
    if (!ref) return "#REF!";
    const v = get(ref.col, ref.row);
    return v ?? 0;
  }

  // Arithmetic expression: =A1+B1*2
  // Replace cell references with their values, then evaluate
  try {
    const replaced = expr.replaceAll(/[A-Z]+\d+/gi, (match) => {
      const ref = parseCellRef(match);
      if (!ref) return "0";
      const key = `${ref.col},${ref.row}`;
      if (evaluating.has(key)) return "0"; // circular ref guard in expression
      const v = get(ref.col, ref.row);
      return String(v ?? 0);
    });
    // Only allow safe characters: digits, operators, parentheses, dots, spaces
    if (!/^[\d+\-*/().  ]+$/.test(replaced)) return "#ERR!";

    const result = new Function(`return (${replaced})`)();
    if (typeof result !== "number" || !Number.isFinite(result)) return "#ERR!";
    return result;
  } catch {
    return "#ERR!";
  }
}

// ---------------------------------------------------------------------------
// Compute all cells (resolve formulas)
// ---------------------------------------------------------------------------

export function computeSheet(
  columns: SheetColumn[],
  rows: SheetRow[],
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  const evaluating = new Set<string>();

  const getRawCell = (col: number, row: number): string => {
    if (col < 0 || col >= columns.length || row < 0 || row >= rows.length) return "";
    return rows[row].cells[columns[col].key] ?? "";
  };

  const getCellValue = (col: number, row: number): number | null => {
    const key = `${col},${row}`;
    if (evaluating.has(key)) return null; // circular ref
    const raw = getRawCell(col, row);
    if (!raw) return null;
    if (raw.startsWith("=")) {
      evaluating.add(key);
      const val = evaluateFormula(raw, getCellValue, evaluating);
      evaluating.delete(key);
      return typeof val === "number" ? val : null;
    }
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  for (const [rowIdx, row] of rows.entries()) {
    const rowResult: Record<string, string> = {};
    for (const col of columns) {
      const raw = row.cells[col.key] ?? "";
      if (raw.startsWith("=")) {
        evaluating.clear();
        const colIdx = columns.indexOf(col);
        evaluating.add(`${colIdx},${rowIdx}`);
        const val = evaluateFormula(raw, getCellValue, evaluating);
        evaluating.delete(`${colIdx},${rowIdx}`);
        if (typeof val === "number") {
          rowResult[col.key] = Number.isInteger(val) ? String(val) : val.toFixed(2);
        } else {
          rowResult[col.key] = String(val);
        }
      } else {
        rowResult[col.key] = raw;
      }
    }
    result[row.id] = rowResult;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Cell CRUD
// ---------------------------------------------------------------------------

export function updateCell(rows: SheetRow[], rowId: string, colKey: string, value: string): SheetRow[] {
  return rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colKey]: value } } : r));
}

export function addRow(config: SheetConfig, position: "top" | "bottom" = "bottom"): SheetConfig {
  const row = createEmptyRow(config.columns);
  return {
    ...config,
    rows: position === "top" ? [row, ...config.rows] : [...config.rows, row],
  };
}

export function deleteRow(config: SheetConfig, rowId: string): SheetConfig {
  return { ...config, rows: config.rows.filter((r) => r.id !== rowId) };
}

export function createColumn(label: string): SheetColumn {
  return { key: `col_${generateId()}`, label };
}

export function addColumn(config: SheetConfig, column: SheetColumn): SheetConfig {
  return {
    ...config,
    columns: [...config.columns, column],
    rows: config.rows.map((r) => ({ ...r, cells: { ...r.cells, [column.key]: "" } })),
  };
}

export function insertRowAt(config: SheetConfig, index: number, count = 1): SheetConfig {
  const newRows = [...config.rows];
  for (let i = 0; i < count; i++) {
    newRows.splice(index, 0, createEmptyRow(config.columns));
  }
  return { ...config, rows: newRows };
}

export function insertColumnAt(config: SheetConfig, index: number, count = 1): SheetConfig {
  let cfg = config;
  for (let i = 0; i < count; i++) {
    const col = createColumn(columnIndexToLetter(cfg.columns.length));
    cfg = {
      ...cfg,
      columns: [...cfg.columns.slice(0, index + i), col, ...cfg.columns.slice(index + i)],
      rows: cfg.rows.map((r) => ({ ...r, cells: { ...r.cells, [col.key]: "" } })),
    };
  }
  return cfg;
}

export function deleteRows(config: SheetConfig, rowIds: string[]): SheetConfig {
  const ids = new Set(rowIds);
  return { ...config, rows: config.rows.filter((r) => !ids.has(r.id)) };
}

export function deleteColumns(config: SheetConfig, colKeys: string[]): SheetConfig {
  const keys = new Set(colKeys);
  return {
    ...config,
    columns: config.columns.filter((c) => !keys.has(c.key)),
    rows: config.rows.map((r) => {
      const cells = { ...r.cells };
      for (const k of keys) delete cells[k];
      return { ...r, cells };
    }),
  };
}

export function deleteColumn(config: SheetConfig, colKey: string): SheetConfig {
  return {
    ...config,
    columns: config.columns.filter((c) => c.key !== colKey),
    rows: config.rows.map((r) => {
      const { [colKey]: _, ...rest } = r.cells;
      return { ...r, cells: rest };
    }),
  };
}

export function renameColumn(config: SheetConfig, colKey: string, label: string): SheetConfig {
  return {
    ...config,
    columns: config.columns.map((c) => (c.key === colKey ? { ...c, label } : c)),
  };
}

// ---------------------------------------------------------------------------
// Paste parsing (tab-delimited text from Excel/Sheets)
// ---------------------------------------------------------------------------

export function parsePastedData(
  text: string,
  columns: SheetColumn[],
  rows: SheetRow[],
  anchorColIdx: number,
  anchorRowIdx: number,
): SheetConfig {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const newRows = rows.map((r) => ({ ...r, cells: { ...r.cells } }));

  for (const [lineIdx, line] of lines.entries()) {
    const cells = line.split("\t");
    const rowIdx = anchorRowIdx + lineIdx;

    // Extend rows if needed
    while (rowIdx >= newRows.length) {
      newRows.push(createEmptyRow(columns));
    }

    for (const [cellIdx, cell] of cells.entries()) {
      const colIdx = anchorColIdx + cellIdx;
      if (colIdx < columns.length) {
        newRows[rowIdx].cells[columns[colIdx].key] = cell;
      }
    }
  }

  return { name: "", columns, rows: newRows };
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

export function getNextCell(
  columns: SheetColumn[],
  rows: SheetRow[],
  colKey: string,
  rowId: string,
  direction: "right" | "left" | "down" | "up",
): { colKey: string; rowId: string } | null {
  const colIdx = columns.findIndex((c) => c.key === colKey);
  const rowIdx = rows.findIndex((r) => r.id === rowId);
  if (colIdx === -1 || rowIdx === -1) return null;

  switch (direction) {
    case "right": {
      return colIdx + 1 < columns.length ? { colKey: columns[colIdx + 1].key, rowId } : null;
    }
    case "left": {
      return colIdx - 1 >= 0 ? { colKey: columns[colIdx - 1].key, rowId } : null;
    }
    case "down": {
      return rowIdx + 1 < rows.length ? { colKey, rowId: rows[rowIdx + 1].id } : null;
    }
    case "up": {
      return rowIdx - 1 >= 0 ? { colKey, rowId: rows[rowIdx - 1].id } : null;
    }
  }
}
