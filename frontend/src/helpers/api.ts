import { Event, EventPayload, HarvesterConfig, HarvesterPreviewItem } from "../types.ts";

export async function postEvents(states: readonly EventPayload[]) {
  const response = await fetch("api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: states }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to submit events: ${result.error}`);
  }
  return result;
}

export type KeywordStatistics = Array<{ keyword: string; count: number }>;

export async function getKeywordStatistics(): Promise<KeywordStatistics> {
  const response = await fetch("api/keywords");
  if (!response.ok) {
    throw new Error(`Failed to fetch keyword statistics: ${response.statusText}`);
  }
  const stats = await response.json();
  // Assumes the API tuuts out either an object (key:count) or an array of keywords (key:1)
  const statList: [string, number][] = Array.isArray(stats)
    ? stats.map((k) => [k, 1])
    : Object.entries(stats);
  statList.sort(([ka, ca], [kb, cb]) => cb - ca || ka.localeCompare(kb));
  return statList.map(([keyword, count]) => ({ keyword, count }));
}

export async function getEvent(id: string): Promise<Event> {
  const response = await fetch(`api/event/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch event: ${response.statusText}`);
  }
  return response.json();
}

export async function getEvents(): Promise<Event[]> {
  const response = await fetch("api/events");
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  return response.json();
}

export async function getHarvesterConfig(): Promise<HarvesterConfig> {
  const response = await fetch("/api/harvester/config");
  if (!response.ok) {
    throw new Error(`Failed to fetch harvester config: ${response.statusText}`);
  }
  return response.json();
}

export async function updateHarvesterConfig(config: Partial<HarvesterConfig>): Promise<HarvesterConfig> {
  const response = await fetch("/api/harvester/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error(`Failed to update harvester config: ${response.statusText}`);
  }
  return response.json();
}

export async function getHarvesterPreview(): Promise<HarvesterPreviewItem[]> {
  const response = await fetch("/api/harvester/preview");
  if (!response.ok) {
    throw new Error(`Failed to fetch harvester preview: ${response.statusText}`);
  }
  return response.json();
}
