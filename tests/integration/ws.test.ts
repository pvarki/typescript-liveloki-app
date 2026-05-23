import axios from "axios";
import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface WebSocketMessage {
  data: unknown;
}

interface TestWebSocket {
  addEventListener(type: "open" | "error", listener: () => void, options?: { once: boolean }): void;
  addEventListener(type: "message", listener: (message: WebSocketMessage) => void): void;
  close(): void;
}

interface EventCreatedPayload {
  type?: string;
  event?: {
    header?: string;
    source?: string;
  };
}

type WebSocketCtor = new (url: string) => TestWebSocket;

function wsEventsUrl() {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/events";
  url.search = "";
  return url.toString();
}

function waitForOpen(socket: TestWebSocket) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WebSocket open timed out")), 5_000);

    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket failed to connect"));
    }, { once: true });
  });
}

function waitForEvent(socket: TestWebSocket, header: string) {
  return new Promise<EventCreatedPayload>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WebSocket event timed out")), 5_000);

    socket.addEventListener("message", (message) => {
      const payload = JSON.parse(String(message.data)) as EventCreatedPayload;
      if (payload.type === "event.created" && payload.event?.header === header) {
        clearTimeout(timeout);
        resolve(payload);
      }
    });
  });
}

describe("WebSocket event stream", () => {
  it("connects to /ws/events and receives an event created with POST /api/v1/events", async () => {
    const WebSocketConstructor = (globalThis as typeof globalThis & {
      WebSocket?: WebSocketCtor;
    }).WebSocket;
    if (!WebSocketConstructor) {
      throw new Error("This test requires a global WebSocket client");
    }

    const socket = new WebSocketConstructor(wsEventsUrl());
    const header = `WebSocket integration event ${randomUUID()}`;

    try {
      await waitForOpen(socket);
      const eventPromise = waitForEvent(socket, header);

      await axios.post(`${API_BASE_URL}/api/v1/events`, {
        events: [
          {
            header,
            link: "https://example.com/ws-event",
            source: "WebSocket integration test",
            admiralty_reliability: "A",
            admiralty_accuracy: "1",
            event_time: new Date().toISOString(),
            keywords: ["websocket", "integration"],
            hcoe_domains: ["Cyber"],
            location: "WebSocket Test Location",
            author: "Integration Tester",
            location_lat: "60.1695",
            location_lng: "24.9354",
          },
        ],
      });

      const payload = await eventPromise;
      expect(payload.event).toMatchObject({
        header,
        source: "WebSocket integration test",
      });
    } finally {
      socket.close();
    }
  });
});
