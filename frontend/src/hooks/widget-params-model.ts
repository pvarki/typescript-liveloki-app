export type WidgetParamValue = string | number | boolean | null | undefined;
export type WidgetParamUpdates = Record<string, WidgetParamValue>;

function toSearchParams(search: string | URLSearchParams): URLSearchParams {
  if (search instanceof URLSearchParams) {
    return new URLSearchParams(search);
  }

  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

function normalizeParamValue(value: WidgetParamValue): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

export function updateWidgetSearchParams(
  search: string | URLSearchParams,
  updates: WidgetParamUpdates,
): URLSearchParams | null {
  const current = toSearchParams(search);
  const next = new URLSearchParams(current);
  let changed = false;

  for (const [rawKey, rawValue] of Object.entries(updates)) {
    const key = rawKey.trim();
    if (!key) continue;

    const value = normalizeParamValue(rawValue);
    if (value === null) {
      if (next.has(key)) {
        next.delete(key);
        changed = true;
      }
      continue;
    }

    if (next.get(key) !== value) {
      next.set(key, value);
      changed = true;
    }
  }

  return changed ? next : null;
}

export function readWidgetParam(search: string | URLSearchParams, key: string): string | null {
  return toSearchParams(search).get(key);
}
