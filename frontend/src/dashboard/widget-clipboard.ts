import type { WidgetDescriptor, WidgetInstance } from "../types";
import { createWidgetId } from "./widget-id";

const CLIPBOARD_SCHEMA = "liveloki.widget";
const CLIPBOARD_VERSION = 1;
const MIN_CLIPBOARD_GRID_SIZE = 1;
const MAX_CLIPBOARD_GRID_SIZE = 48;

interface WidgetClipboardPayload {
  schema: typeof CLIPBOARD_SCHEMA;
  version: typeof CLIPBOARD_VERSION;
  type: string;
  size: {
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  };
  config: Record<string, unknown>;
}

interface PasteResult {
  ok: boolean;
  widget?: WidgetInstance;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readClampedGridSize(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(
    MAX_CLIPBOARD_GRID_SIZE,
    Math.max(MIN_CLIPBOARD_GRID_SIZE, Math.round(numeric)),
  );
}

function cloneConfig(config: Record<string, unknown>): Record<string, unknown> {
  return structuredClone(config);
}

export function createWidgetClipboardPayload(
  widget: WidgetInstance,
  descriptor: WidgetDescriptor,
): WidgetClipboardPayload {
  return {
    schema: CLIPBOARD_SCHEMA,
    version: CLIPBOARD_VERSION,
    type: widget.type,
    size: {
      w: widget.gridPosition.w,
      h: widget.gridPosition.h,
      minW: widget.gridPosition.minW,
      minH: widget.gridPosition.minH,
    },
    config: descriptor.toClipboardConfig
      ? descriptor.toClipboardConfig(widget.config)
      : cloneConfig(widget.config),
  };
}

export function serializeWidgetForClipboard(widget: WidgetInstance, descriptor: WidgetDescriptor): string {
  return JSON.stringify(createWidgetClipboardPayload(widget, descriptor), null, 2);
}

export function createWidgetFromClipboard(
  text: string,
  getDescriptor: (type: string) => WidgetDescriptor | undefined,
): PasteResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Clipboard does not contain widget JSON." };
  }

  if (!isRecord(parsed) || parsed.schema !== CLIPBOARD_SCHEMA || parsed.version !== CLIPBOARD_VERSION) {
    return { ok: false, error: "Clipboard JSON is not a LiveLoki widget." };
  }

  if (typeof parsed.type !== "string") {
    return { ok: false, error: "Clipboard widget is missing a type." };
  }

  const descriptor = getDescriptor(parsed.type);
  if (!descriptor) {
    return { ok: false, error: `Unknown widget type: ${parsed.type}` };
  }

  const rawConfig = isRecord(parsed.config) ? parsed.config : {};
  const config = descriptor.fromClipboardConfig
    ? descriptor.fromClipboardConfig(rawConfig)
    : { ...descriptor.defaultConfig, ...rawConfig };
  const size = isRecord(parsed.size) ? parsed.size : {};
  const minW = readClampedGridSize(size.minW, descriptor.defaultSize.minW);
  const minH = readClampedGridSize(size.minH, descriptor.defaultSize.minH);

  return {
    ok: true,
    widget: {
      id: createWidgetId(parsed.type),
      type: parsed.type,
      gridPosition: {
        x: 0,
        y: 0,
        w: Math.max(minW, readClampedGridSize(size.w, descriptor.defaultSize.w)),
        h: Math.max(minH, readClampedGridSize(size.h, descriptor.defaultSize.h)),
        minW,
        minH,
      },
      config,
    },
  };
}
