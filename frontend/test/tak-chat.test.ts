import { describe, expect, it, vi } from "vitest";

import {
  normalizeTakChatSnapshot,
  publishTakChatMessage,
  readTakChatRefreshMs,
} from "../src/widgets/tak-chat/tak-chat";

describe("TAK chat helpers", () => {
  it("normalizes valid chat snapshots", () => {
    const snapshot = normalizeTakChatSnapshot({
      enabled: true,
      connected: true,
      status: "connected",
      liveOnly: true,
      missedWhileDisconnected: false,
      messageCount: 2,
      messages: [
        {
          id: "a",
          messageId: "msg-a",
          roomId: "all",
          senderCallsign: "Phone",
          body: "Hello",
          eventTime: "2026-05-14T10:00:00Z",
          receivedAt: "2026-05-14T10:00:01Z",
          status: "received",
          source: "tak",
        },
        {
          id: "b",
          messageId: null,
          roomId: "all",
          senderCallsign: "BattleLog",
          body: "Hi back",
          eventTime: "2026-05-14T10:00:05Z",
          receivedAt: "2026-05-14T10:00:05Z",
          status: "sent",
          source: "battlelog",
        },
      ],
    });

    expect(snapshot.enabled).toBe(true);
    expect(snapshot.liveOnly).toBe(true);
    expect(snapshot.missedWhileDisconnected).toBe(false);
    expect(snapshot.messages).toHaveLength(2);
    expect(snapshot.messages[0].senderCallsign).toBe("Phone");
    expect(snapshot.messages[1].source).toBe("battlelog");
  });

  it("rejects invalid messages and preserves order", () => {
    const snapshot = normalizeTakChatSnapshot({
      enabled: true,
      messages: [
        { id: "good", body: "ok" },
        { id: "", body: "missing id" },
        { id: "blank", body: "" },
        null,
        { id: "good2", body: "second" },
      ],
    });

    expect(snapshot.messages.map((m) => m.id)).toEqual(["good", "good2"]);
  });

  it("normalizes status fields including liveOnly and missedWhileDisconnected", () => {
    const empty = normalizeTakChatSnapshot({});
    expect(empty.status).toBe("disabled");
    expect(empty.liveOnly).toBe(true);
    expect(empty.missedWhileDisconnected).toBe(false);

    const partial = normalizeTakChatSnapshot({
      enabled: true,
      connected: false,
      missedWhileDisconnected: true,
    });
    expect(partial.status).toBe("disconnected");
    expect(partial.missedWhileDisconnected).toBe(true);
  });

  it("bounds refresh interval", () => {
    expect(readTakChatRefreshMs("bad", 1500)).toBe(1500);
    expect(readTakChatRefreshMs(100, 1500)).toBe(750);
    expect(readTakChatRefreshMs(10_000, 1500)).toBe(5000);
    expect(readTakChatRefreshMs(2000)).toBe(2000);
  });

  it("publishTakChatMessage posts JSON to api/tak/chat", async () => {
    const originalFetch = globalThis.fetch;
    const calls: unknown[] = [];
    globalThis.fetch = vi.fn(async (...args: unknown[]) => {
      calls.push(args);
      return {
        ok: true,
        json: async () => ({
          message: {
            id: "msg-1",
            messageId: "msg-1",
            roomId: "all",
            senderCallsign: "BattleLog",
            body: "hello",
            eventTime: null,
            receivedAt: "2026-05-14T10:00:00Z",
            status: "sent",
            source: "battlelog",
          },
        }),
      } as Response;
    });

    try {
      const message = await publishTakChatMessage({ body: "hello", senderCallsign: "BattleLog" });
      expect(message.id).toBe("msg-1");
      expect(message.source).toBe("battlelog");
      expect(calls[0]).toMatchObject([
        "api/tak/chat",
        { method: "POST", headers: { "Content-Type": "application/json" } },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("publishTakChatMessage throws on API error payload", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "TAK stream is not connected" }),
    }) as unknown as Response);

    try {
      await expect(publishTakChatMessage({ body: "hi" })).rejects.toThrow(
        "TAK stream is not connected",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("publishTakChatMessage rejects invalid response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ message: { id: "", body: "" } }),
    }) as unknown as Response);

    try {
      await expect(publishTakChatMessage({ body: "hi" })).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
