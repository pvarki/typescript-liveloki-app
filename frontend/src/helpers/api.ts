import { EventPayload } from "../types.ts";

export async function postEvents(states: readonly EventPayload[]) {
  const response = await fetch("events", {
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

export type KeywordStatistics = Record<string, number>;

export async function getKeywordStatistics(): Promise<KeywordStatistics> {
  const response = await fetch("keywords");
  if (!response.ok) {
    throw new Error(`Failed to fetch keyword statistics: ${response.statusText}`);
  }
  const stats = await response.json();
  if (Array.isArray(stats)) {
    // Just an array of keywords, convert to object; we don't know the counts
    return Object.fromEntries(stats.map((keyword) => [keyword, 1]));
  }
  throw new Error("Unimplemented: expected array of keywords from /keywords");
}
