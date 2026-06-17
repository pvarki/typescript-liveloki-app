import { sanitizeWidgetsLayout } from "../dashboard/grid-layout-model";
import type { DashboardData, DashboardSettings, WidgetInstance } from "../types";

function parseLayout(layoutJson: string): WidgetInstance[] {
  try {
    return sanitizeWidgetsLayout(JSON.parse(layoutJson));
  } catch {
    return [];
  }
}

function serializeLayout(widgets: WidgetInstance[]): string {
  return JSON.stringify(sanitizeWidgetsLayout(widgets));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function payloadErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const message = payload.error ?? payload.message;
  return typeof message === "string" && message.trim() ? message : null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, statusText: string, payload: unknown) {
    const detail = payloadErrorMessage(payload);
    super(detail || `Request failed with status ${status}${statusText ? ` ${statusText}` : ""}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Unexpected API error";
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const payload = await readJson(response);

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, payload);
  }

  return payload;
}

function isDashboardData(value: unknown): value is DashboardData {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.cols === "number" &&
    typeof value.rowHeight === "number" &&
    typeof value.layout === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function expectDashboardData(payload: unknown): DashboardData {
  if (isDashboardData(payload)) return payload;
  throw new TypeError("Unexpected dashboard response from API");
}

function expectDashboardList(payload: unknown): DashboardData[] {
  if (!Array.isArray(payload)) {
    throw new TypeError(payloadErrorMessage(payload) ?? "Unexpected dashboard list response from API");
  }

  if (!payload.every(isDashboardData)) {
    throw new TypeError("Unexpected dashboard item in API response");
  }

  return payload;
}

export async function listDashboards(): Promise<DashboardData[]> {
  return expectDashboardList(await fetchJson("/api/dashboards"));
}

export async function getDashboard(id: string): Promise<DashboardData> {
  return expectDashboardData(await fetchJson(`/api/dashboards/${id}`));
}

export async function createDashboard(data: {
  name?: string;
  cols?: number;
  rowHeight?: number;
  settings?: DashboardSettings;
  widgets?: WidgetInstance[];
}): Promise<DashboardData> {
  const body: Record<string, unknown> = { ...data };
  if (data.widgets) {
    body.layout = serializeLayout(data.widgets);
    delete body.widgets;
  }

  return expectDashboardData(
    await fetchJson("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function updateDashboard(
  id: string,
  data: {
    name?: string;
    cols?: number;
    rowHeight?: number;
    settings?: DashboardSettings;
    widgets?: WidgetInstance[];
  }
): Promise<DashboardData> {
  const body: Record<string, unknown> = { ...data };
  if (data.widgets) {
    body.layout = serializeLayout(data.widgets);
    delete body.widgets;
  }
  return expectDashboardData(
    await fetchJson(`/api/dashboards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function deleteDashboard(id: string): Promise<void> {
  await fetchJson(`/api/dashboards/${id}`, { method: "DELETE" });
}

export async function deleteAllDashboards(): Promise<void> {
  await fetchJson("/api/dashboards", { method: "DELETE" });
}

export { parseLayout, serializeLayout };
