import type { DashboardSettings } from "../types";

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  gap: 4,
  padding: 4,
  widgetBorders: "subtle",
  widgetHeaders: "edit-only",
};

export const DASHBOARD_GAP_OPTIONS = [0, 2, 4, 8] as const;
export const DASHBOARD_PADDING_OPTIONS = [0, 4, 8, 16] as const;
export const DASHBOARD_WIDGET_BORDER_OPTIONS = ["none", "subtle", "visible"] as const;
export const DASHBOARD_WIDGET_HEADER_OPTIONS = ["always", "edit-only", "never"] as const;

function oneOf<const T extends readonly unknown[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  return (allowed as readonly unknown[]).includes(value) ? (value as T[number]) : fallback;
}

export function sanitizeDashboardSettings(
  value: unknown,
  fallback: DashboardSettings = DEFAULT_DASHBOARD_SETTINGS,
): DashboardSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }

  const settings = value as Record<string, unknown>;

  return {
    gap: oneOf(settings.gap, DASHBOARD_GAP_OPTIONS, fallback.gap),
    padding: oneOf(settings.padding, DASHBOARD_PADDING_OPTIONS, fallback.padding),
    widgetBorders: oneOf(
      settings.widgetBorders,
      DASHBOARD_WIDGET_BORDER_OPTIONS,
      fallback.widgetBorders,
    ),
    widgetHeaders: oneOf(
      settings.widgetHeaders,
      DASHBOARD_WIDGET_HEADER_OPTIONS,
      fallback.widgetHeaders,
    ),
  };
}
