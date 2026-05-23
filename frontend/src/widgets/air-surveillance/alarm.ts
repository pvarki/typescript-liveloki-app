import type { Event } from "../../types";
import type { AlarmState } from "./types";

export interface ActiveAlarm {
  state: Exclude<AlarmState, "vaara_ohi">;
  declaredAt: string;
  eventId: string | number;
}

const ACTIVE_STATES = new Set<string>(["alarm:ilmahalytys", "alarm:ilmavaroitus"]);

export function deriveActiveAlarm(events?: readonly Event[]): ActiveAlarm | null {
  if (!events || events.length === 0) return null;
  const sorted = events.toSorted((a, b) => {
    const ta = Date.parse(a.event_time || a.creation_time || "") || 0;
    const tb = Date.parse(b.event_time || b.creation_time || "") || 0;
    return tb - ta;
  });
  for (const event of sorted) {
    if (!event.keywords?.some((k) => k.startsWith("alarm:"))) continue;
    if (event.keywords.includes("alarm:vaara_ohi")) return null;
    const stateKeyword = event.keywords.find((k) => ACTIVE_STATES.has(k));
    if (!stateKeyword) continue;
    const state = stateKeyword === "alarm:ilmahalytys" ? "ilmahalytys" : "ilmavaroitus";
    return { state, declaredAt: event.event_time || event.creation_time, eventId: event.id };
  }
  return null;
}
