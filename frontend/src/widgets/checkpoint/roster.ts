import type { Event } from "../../types";
import type { CheckpointPerson, PersonState } from "./types";

const HEADER_PREFIX_IN = "Checkpoint IN: ";
const HEADER_PREFIX_OUT = "Checkpoint OUT: ";

export function slugifyName(name: string): string {
  return name.trim().toLowerCase().replaceAll(/\s+/g, "-");
}

function isCheckpointEvent(event: Event): boolean {
  return event.keywords?.includes("checkpoint") ?? false;
}

function personSlugOf(event: Event): string | null {
  const kw = event.keywords?.find((k) => k.startsWith("person:"));
  return kw ? kw.slice("person:".length) : null;
}

function stateOf(event: Event): PersonState | null {
  if (event.keywords?.includes("state:in")) return "in";
  if (event.keywords?.includes("state:out")) return "out";
  return null;
}

function eventTime(event: Event): number {
  return Date.parse(event.event_time || event.creation_time || "") || 0;
}

function displayNameFrom(event: Event): string {
  const header = event.header || "";
  if (header.startsWith(HEADER_PREFIX_IN)) return header.slice(HEADER_PREFIX_IN.length);
  if (header.startsWith(HEADER_PREFIX_OUT)) return header.slice(HEADER_PREFIX_OUT.length);
  return header;
}

export function currentStateOf(events: readonly Event[] | undefined, slug: string): PersonState | "unknown" {
  if (!events || events.length === 0) return "unknown";
  let latestTs = -Infinity;
  let latestState: PersonState | null = null;
  for (const event of events) {
    if (!isCheckpointEvent(event)) continue;
    if (personSlugOf(event) !== slug) continue;
    const state = stateOf(event);
    if (!state) continue;
    const ts = eventTime(event);
    if (ts > latestTs) {
      latestTs = ts;
      latestState = state;
    }
  }
  return latestState ?? "unknown";
}

export interface ParsedSlug {
  base: string;
  num: number | null;
}

export function parseSlug(slug: string): ParsedSlug {
  const match = slug.match(/^(.+?)-(\d+)$/);
  if (!match) return { base: slug, num: null };
  return { base: match[1], num: Number(match[2]) };
}

export function findInsidePersonsByBase(events: readonly Event[] | undefined, baseSlug: string): CheckpointPerson[] {
  return deriveInsideRoster(events).filter((p) => p.slug === baseSlug || p.slug.startsWith(`${baseSlug}-`));
}

export function nextNamesakeSlug(events: readonly Event[] | undefined, baseSlug: string): string {
  if (!events || events.length === 0) return baseSlug;
  const usedNums = new Set<number | null>();
  let baseSeen = false;
  for (const event of events) {
    if (!isCheckpointEvent(event)) continue;
    const slug = personSlugOf(event);
    if (!slug) continue;
    const parsed = parseSlug(slug);
    if (parsed.base !== baseSlug) continue;
    if (parsed.num === null) baseSeen = true;
    else usedNums.add(parsed.num);
  }
  if (!baseSeen) return baseSlug;
  for (let n = 2; n < 1000; n++) {
    if (!usedNums.has(n)) return `${baseSlug}-${n}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

export function deriveInsideRoster(events?: readonly Event[]): CheckpointPerson[] {
  if (!events || events.length === 0) return [];
  const latestByPerson = new Map<string, { event: Event; ts: number }>();
  for (const event of events) {
    if (!isCheckpointEvent(event)) continue;
    const slug = personSlugOf(event);
    if (!slug) continue;
    const ts = eventTime(event);
    const existing = latestByPerson.get(slug);
    if (!existing || ts > existing.ts) latestByPerson.set(slug, { event, ts });
  }
  const roster: CheckpointPerson[] = [];
  for (const [slug, { event }] of latestByPerson) {
    if (stateOf(event) !== "in") continue;
    roster.push({
      slug,
      displayName: displayNameFrom(event),
      since: event.event_time || event.creation_time,
    });
  }
  roster.sort((a, b) => Date.parse(b.since) - Date.parse(a.since));
  return roster;
}
