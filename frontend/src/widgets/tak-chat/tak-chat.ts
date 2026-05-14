import useSWR from "swr";

export interface NewTakChatMessage {
  body: string;
  senderCallsign?: string;
}

export interface TakChatMessage {
  id: string;
  messageId: string | null;
  roomId: "all";
  senderCallsign: string;
  body: string;
  eventTime: string | null;
  receivedAt: string;
  status: string;
  source: "tak" | "battlelog";
}

export interface TakChatSnapshot {
  enabled: boolean;
  connected: boolean;
  status: "disabled" | "connecting" | "connected" | "disconnected" | "error" | string;
  lastEventAt: string | null;
  lastError: string | null;
  liveOnly: boolean;
  missedWhileDisconnected: boolean;
  messageCount: number;
  messages: TakChatMessage[];
}

export const DEFAULT_TAK_CHAT_SNAPSHOT: TakChatSnapshot = {
  enabled: false,
  connected: false,
  status: "disabled",
  lastEventAt: null,
  lastError: null,
  liveOnly: true,
  missedWhileDisconnected: false,
  messageCount: 0,
  messages: [],
};

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function normalizeMessage(value: unknown): TakChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = readString(record.id).trim();
  const body = readString(record.body).trim();
  if (!id || !body) return null;
  const source = record.source === "battlelog" ? "battlelog" : "tak";
  return {
    id,
    messageId: readNullableString(record.messageId),
    roomId: "all",
    senderCallsign: readString(record.senderCallsign, "unknown") || "unknown",
    body,
    eventTime: readNullableString(record.eventTime),
    receivedAt: readString(record.receivedAt) || new Date().toISOString(),
    status: readString(record.status, source === "battlelog" ? "sent" : "received"),
    source,
  };
}

export function normalizeTakChatSnapshot(value: unknown): TakChatSnapshot {
  if (!value || typeof value !== "object") return DEFAULT_TAK_CHAT_SNAPSHOT;
  const record = value as Record<string, unknown>;
  const messages = Array.isArray(record.messages)
    ? record.messages
        .map(normalizeMessage)
        .filter((message): message is TakChatMessage => message !== null)
    : [];

  return {
    enabled: Boolean(record.enabled),
    connected: Boolean(record.connected),
    status: readString(record.status, record.enabled ? "disconnected" : "disabled"),
    lastEventAt: readNullableString(record.lastEventAt),
    lastError: readNullableString(record.lastError),
    liveOnly: record.liveOnly === false ? false : true,
    missedWhileDisconnected: Boolean(record.missedWhileDisconnected),
    messageCount: typeof record.messageCount === "number" ? record.messageCount : messages.length,
    messages,
  };
}

async function getTakChatSnapshot(): Promise<TakChatSnapshot> {
  const response = await fetch("api/tak/chat");
  if (!response.ok) throw new Error(`Failed to fetch TAK chat: ${response.statusText}`);
  return normalizeTakChatSnapshot(await response.json());
}

export function useTakChat(enabled: boolean, refreshInterval: number) {
  return useSWR(enabled ? "tak-chat" : null, getTakChatSnapshot, {
    refreshInterval,
    fallbackData: DEFAULT_TAK_CHAT_SNAPSHOT,
  });
}

export async function publishTakChatMessage(message: NewTakChatMessage): Promise<TakChatMessage> {
  const response = await fetch("api/tak/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const text =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Failed to publish TAK chat: ${response.status}`;
    throw new Error(text);
  }
  const normalized = normalizeMessage((payload as { message?: unknown }).message);
  if (!normalized) throw new Error("TAK chat publish response was invalid");
  return normalized;
}

export function readTakChatRefreshMs(value: unknown, fallback = 1500): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 750), 5000);
}
