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

export async function listDashboards(): Promise<DashboardData[]> {
  const res = await fetch("/api/dashboards");
  return res.json();
}

export async function getDashboard(id: string): Promise<DashboardData> {
  const res = await fetch(`/api/dashboards/${id}`);
  return res.json();
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

  const res = await fetch("/api/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateDashboard(
  id: string,
  data: {
    name?: string;
    cols?: number;
    rowHeight?: number;
    settings?: DashboardSettings;
    widgets?: WidgetInstance[];
  },
): Promise<DashboardData> {
  const body: Record<string, unknown> = { ...data };
  if (data.widgets) {
    body.layout = serializeLayout(data.widgets);
    delete body.widgets;
  }
  const res = await fetch(`/api/dashboards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteDashboard(id: string): Promise<void> {
  await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
}

export async function deleteAllDashboards(): Promise<void> {
  await fetch("/api/dashboards", { method: "DELETE" });
}

export { parseLayout, serializeLayout };
