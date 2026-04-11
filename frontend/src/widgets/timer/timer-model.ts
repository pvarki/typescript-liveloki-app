export type TimerMode = "relative" | "absolute";
export type TimerStatus = "idle" | "running" | "completed";

export interface TimerWidgetConfig extends Record<string, unknown> {
  mode: TimerMode;
  relativeInput: string;
  absoluteTime: string;
  endAt: string | null;
  startedAt: string | null;
  status: TimerStatus;
  lastHandledAt: string | null;
  lastNotificationId: string | null;
}

export type TimerConfig = TimerWidgetConfig;

export interface TimerRuntimeState {
  phase: "idle" | "running" | "due" | "completed";
  remainingMs: number;
  shouldHandleDue: boolean;
}

const RELATIVE_PART_RE =
  /(\d+)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/gi;

const UNIT_TO_MS: Record<string, number> = {
  h: 60 * 60 * 1000,
  hr: 60 * 60 * 1000,
  hrs: 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  m: 60 * 1000,
  min: 60 * 1000,
  mins: 60 * 1000,
  minute: 60 * 1000,
  minutes: 60 * 1000,
  s: 1000,
  sec: 1000,
  secs: 1000,
  second: 1000,
  seconds: 1000,
};

const DEFAULT_TIMER_CONFIG: TimerWidgetConfig = {
  mode: "relative",
  relativeInput: "30 minutes",
  absoluteTime: "",
  endAt: null,
  startedAt: null,
  status: "idle",
  lastHandledAt: null,
  lastNotificationId: null,
};

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readMode(value: unknown): TimerMode {
  return value === "absolute" ? "absolute" : "relative";
}

function readStatus(value: unknown): TimerStatus {
  return value === "running" || value === "completed" ? value : "idle";
}

export function getDefaultTimerConfig(): TimerWidgetConfig {
  return { ...DEFAULT_TIMER_CONFIG };
}

export function getTimerConfig(config: Record<string, unknown>): TimerWidgetConfig {
  return {
    mode: readMode(config.mode),
    relativeInput: readString(config.relativeInput, DEFAULT_TIMER_CONFIG.relativeInput),
    absoluteTime: readString(config.absoluteTime, DEFAULT_TIMER_CONFIG.absoluteTime),
    endAt: typeof config.endAt === "string" ? config.endAt : null,
    startedAt: typeof config.startedAt === "string" ? config.startedAt : null,
    status: readStatus(config.status),
    lastHandledAt: typeof config.lastHandledAt === "string" ? config.lastHandledAt : null,
    lastNotificationId:
      typeof config.lastNotificationId === "string" ? config.lastNotificationId : null,
  };
}

export function parseRelativeDuration(
  input: string
): { ok: true; milliseconds: number } | { ok: false; error: string } {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, error: "Enter a duration like 30 minutes." };
  }

  let milliseconds = 0;
  let partCount = 0;

  for (const match of normalized.matchAll(RELATIVE_PART_RE)) {
    const [, rawValue, rawUnit] = match;
    const value = Number(rawValue);
    const unit = UNIT_TO_MS[rawUnit.toLowerCase()];

    if (!Number.isFinite(value) || value <= 0 || !unit) {
      return { ok: false, error: "Use a duration like 30 minutes or 1h 15m." };
    }

    milliseconds += value * unit;
    partCount += 1;
  }

  if (partCount === 0 || milliseconds <= 0) {
    return { ok: false, error: "Use a duration like 30 minutes or 1h 15m." };
  }

  // Regex replace keeps ES2020 compatibility for the Battlelog frontend target.
  // eslint-disable-next-line unicorn/prefer-string-replace-all
  const stripped = normalized.replace(RELATIVE_PART_RE, "").trim();
  if (stripped.length > 0) {
    return { ok: false, error: "Use a duration like 30 minutes or 1h 15m." };
  }

  return { ok: true, milliseconds };
}

export function resolveSameDayAbsoluteTime(
  input: string,
  now = new Date()
): { ok: true; endAt: Date } | { ok: false; error: string } {
  const match = input.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return { ok: false, error: "Enter a time in HH:MM format." };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return { ok: false, error: "Enter a valid 24-hour time." };
  }

  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  if (candidate.getTime() <= now.getTime()) {
    return { ok: false, error: "Choose a future time later today." };
  }

  return { ok: true, endAt: candidate };
}

export function computeRemainingMs(endAt: string | null, now = new Date()): number {
  if (!endAt) return 0;
  const endMs = Date.parse(endAt);
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - now.getTime());
}

export function startTimer(
  config: TimerWidgetConfig,
  now = new Date()
): { ok: true; config: TimerWidgetConfig } | { ok: false; error: string } {
  let endAt: Date;

  if (config.mode === "absolute") {
    const resolved = resolveSameDayAbsoluteTime(config.absoluteTime, now);
    if (!resolved.ok) return resolved;
    endAt = resolved.endAt;
  } else {
    const parsed = parseRelativeDuration(config.relativeInput);
    if (!parsed.ok) return parsed;
    endAt = new Date(now.getTime() + parsed.milliseconds);
  }

  return {
    ok: true,
    config: {
      ...config,
      endAt: endAt.toISOString(),
      startedAt: now.toISOString(),
      status: "running",
      lastHandledAt: null,
      lastNotificationId: null,
    },
  };
}

export function clearTimer(config: TimerWidgetConfig): TimerWidgetConfig {
  return {
    ...config,
    endAt: null,
    startedAt: null,
    status: "idle",
    lastHandledAt: null,
    lastNotificationId: null,
  };
}

export function markTimerHandled(
  config: TimerWidgetConfig,
  handledAt: string,
  notificationId: string
): TimerWidgetConfig {
  return {
    ...config,
    status: "completed",
    lastHandledAt: handledAt,
    lastNotificationId: notificationId,
  };
}

export function getTimerRuntimeState(
  config: TimerWidgetConfig,
  now = new Date()
): TimerRuntimeState {
  if (!config.endAt || config.status === "idle") {
    return { phase: "idle", remainingMs: 0, shouldHandleDue: false };
  }

  const remainingMs = computeRemainingMs(config.endAt, now);
  if (remainingMs > 0 && config.status === "running") {
    return { phase: "running", remainingMs, shouldHandleDue: false };
  }

  if (config.lastHandledAt || config.lastNotificationId || config.status === "completed") {
    return { phase: "completed", remainingMs: 0, shouldHandleDue: false };
  }

  return { phase: "due", remainingMs: 0, shouldHandleDue: true };
}
