import { Button, FormGroup, InputGroup, TextArea } from "@blueprintjs/core";
import { useEffect, useRef, useState } from "react";

import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import {
  publishTakChatMessage,
  readTakChatRefreshMs,
  type TakChatMessage,
  useTakChat,
} from "./tak-chat";

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function formatTimestamp(message: TakChatMessage): string {
  const stamp = message.eventTime || message.receivedAt;
  if (!stamp) return "";
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString();
}

function MessageRow({ message }: { message: TakChatMessage }) {
  const isLocal = message.source === "battlelog";
  return (
    <div
      className={`flex flex-col rounded border px-2 py-1 text-xs ${
        isLocal
          ? "border-[var(--color-accent)] bg-[var(--color-surface-secondary)]"
          : "border-transparent"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{message.senderCallsign || "unknown"}</span>
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          {formatTimestamp(message)}
          {isLocal && message.status ? ` · ${message.status}` : ""}
        </span>
      </div>
      <div className="whitespace-pre-wrap break-words">{message.body}</div>
    </div>
  );
}

function TakChatWidget({ config, isEditMode }: WidgetProps) {
  const senderCallsign = readString(config.senderCallsign, "BattleLog");
  const refreshMs = readTakChatRefreshMs(config.refreshMs);
  const { data, error, isLoading, mutate } = useTakChat(true, refreshMs);
  const [draft, setDraft] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const snapshot = data;
  const messages = snapshot?.messages ?? [];

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const disabled = !snapshot?.enabled;
  const disconnected = Boolean(snapshot?.enabled) && !snapshot?.connected;
  const missed = Boolean(snapshot?.missedWhileDisconnected);
  const canSend = !disabled && !isEditMode && snapshot?.connected;

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || !canSend) return;
    setIsSending(true);
    setPublishError(null);
    try {
      await publishTakChatMessage({ body: trimmed, senderCallsign });
      setDraft("");
      await mutate();
    } catch (error_) {
      setPublishError(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-separator)] px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
        <span>TAK All Chat</span>
        <span>·</span>
        <span>{disabled ? "Disabled" : snapshot?.status ?? "unknown"}</span>
        {snapshot?.liveOnly && <span>· live-only</span>}
        {missed && (
          <span className="text-[var(--color-warning)]">· history may be incomplete</span>
        )}
        {error && <span className="text-[var(--color-danger)]">· fetch error</span>}
      </div>
      {isLoading && messages.length === 0 && (
        <div className="flex h-full items-center justify-center p-3 text-xs text-[var(--color-muted-foreground)]">
          Loading TAK chat...
        </div>
      )}
      {disabled && (
        <div className="flex flex-1 items-center justify-center p-3 text-center text-xs text-[var(--color-muted-foreground)]">
          TAK integration is disabled. Chat unavailable.
        </div>
      )}
      {!disabled && (
        <>
          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2"
          >
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
            {messages.length === 0 && !isLoading && (
              <div className="p-3 text-center text-xs text-[var(--color-muted-foreground)]">
                No messages yet.
              </div>
            )}
          </div>
          {disconnected && (
            <div className="border-t border-[var(--color-separator)] px-3 py-1 text-[11px] text-[var(--color-warning)]">
              TAK stream not connected. Sending is disabled until reconnect.
            </div>
          )}
          <div className="flex flex-col gap-1 border-t border-[var(--color-separator)] p-2">
            <TextArea
              fill
              small
              rows={2}
              disabled={!canSend || isSending}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Send as ${senderCallsign}…`}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {draft.length}/500
              </span>
              <Button
                small
                intent="primary"
                disabled={!canSend || !draft.trim()}
                loading={isSending}
                onClick={() => void handleSend()}
              >
                Send
              </Button>
            </div>
            {publishError && (
              <div className="rounded bg-black/60 px-2 py-1 text-[11px] text-[var(--color-danger)]">
                Send failed: {publishError}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TakChatConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Sender callsign">
        <InputGroup
          value={readString(config.senderCallsign, "BattleLog")}
          onChange={(event) => onChange({ ...config, senderCallsign: event.target.value })}
        />
      </FormGroup>
      <FormGroup label="Refresh interval (ms)">
        <InputGroup
          value={String(readTakChatRefreshMs(config.refreshMs))}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onChange({ ...config, refreshMs: parsed });
          }}
        />
      </FormGroup>
    </div>
  );
}

export const takChatDescriptor: WidgetDescriptor = {
  type: "tak-chat",
  name: "TAK Chat",
  description: "Live TAK default/all group chat (live-only, no history persistence)",
  icon: <span className="text-lg">💬</span>,
  defaultSize: { w: 4, h: 6, minW: 3, minH: 4 },
  defaultConfig: { senderCallsign: "BattleLog", refreshMs: 1500 },
  component: TakChatWidget,
  configPanel: TakChatConfigPanel,
  needsScroll: false,
};
