export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  id: string;
  cells: Record<string, string>;
}

export interface TableWidgetConfig extends Record<string, unknown> {
  columns: TableColumn[];
  rows: TableRow[];
}

export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { key: "title", label: "Title" },
  { key: "source", label: "Source" },
  { key: "eventTime", label: "Event time" },
  { key: "location", label: "Location" },
  { key: "author", label: "Author" },
];

export const DEFAULT_TABLE_CONFIG: TableWidgetConfig = {
  columns: DEFAULT_TABLE_COLUMNS,
  rows: [],
};

function isTableColumn(value: unknown): value is TableColumn {
  if (!value || typeof value !== "object") return false;
  const column = value as Record<string, unknown>;
  return typeof column.key === "string" && typeof column.label === "string";
}

function isTableRow(value: unknown): value is TableRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && !!row.cells && typeof row.cells === "object";
}

export function getTableColumns(config: Record<string, unknown>): TableColumn[] {
  const columns = config.columns;
  if (!Array.isArray(columns)) return DEFAULT_TABLE_COLUMNS;

  const validColumns = columns.filter(isTableColumn);
  return validColumns.length > 0 ? validColumns : DEFAULT_TABLE_COLUMNS;
}

export function getTableRows(config: Record<string, unknown>): TableRow[] {
  const rows = config.rows;
  if (!Array.isArray(rows)) return [];

  return rows.filter(isTableRow).map((row) => ({
    id: row.id,
    cells: Object.fromEntries(Object.entries(row.cells).map(([key, value]) => [key, String(value ?? "")])),
  }));
}

export function createTableRow(
  columns: TableColumn[],
  values: Record<string, string>,
  id = Math.random().toString(36).slice(2, 10),
): TableRow {
  return {
    id,
    cells: Object.fromEntries(columns.map((column) => [column.key, values[column.key]?.trim() ?? ""])),
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
}

export function createTableRowsFromCsv(
  csv: string,
  columns: TableColumn[] = DEFAULT_TABLE_COLUMNS,
): TableRow[] {
  const [headers, ...records] = parseCsv(csv);
  if (!headers) return [];

  const columnIndexes = columns.map((column) =>
    headers.findIndex((header) => header.trim().toLowerCase() === column.label.toLowerCase()),
  );

  return records.map((record, recordIndex) => ({
    id: `preseed-${recordIndex + 1}`,
    cells: Object.fromEntries(
      columns.map((column, columnIndex) => {
        const recordIndexForColumn = columnIndexes[columnIndex];
        return [column.key, recordIndexForColumn >= 0 ? (record[recordIndexForColumn] ?? "") : ""];
      }),
    ),
  }));
}

export function createPreseededTableConfig(csv: string): TableWidgetConfig {
  return {
    columns: DEFAULT_TABLE_COLUMNS,
    rows: createTableRowsFromCsv(csv, DEFAULT_TABLE_COLUMNS),
  };
}

export function addTableRow(
  config: Record<string, unknown>,
  values: Record<string, string>,
  id?: string,
): TableWidgetConfig {
  const columns = getTableColumns(config);
  return {
    ...config,
    columns,
    rows: [createTableRow(columns, values, id), ...getTableRows(config)],
  };
}
