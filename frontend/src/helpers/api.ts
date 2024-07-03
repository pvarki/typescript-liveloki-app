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
