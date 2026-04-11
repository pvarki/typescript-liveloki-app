import { describe, expect, it } from "vitest";

import { createWidgetFromClipboard, serializeWidgetForClipboard } from "../src/dashboard/widget-clipboard";
import type { WidgetDescriptor, WidgetInstance } from "../src/types";
import { externalEmbedDescriptor } from "../src/widgets/external-embed";
import { rtmpVideoDescriptor } from "../src/widgets/rtmp-video";

const noteDescriptor: WidgetDescriptor = {
  type: "note",
  name: "Note",
  description: "Test note",
  icon: "N",
  defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
  defaultConfig: { text: "" },
  component: () => null,
};

const noteWidget: WidgetInstance = {
  id: "note-1",
  type: "note",
  gridPosition: { x: 1, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
  config: { text: "hello" },
};

function getDescriptor(type: string) {
  return type === "note" ? noteDescriptor : undefined;
}

describe("widget clipboard", () => {
  it("serializes type, size, and config", () => {
    const text = serializeWidgetForClipboard(noteWidget, noteDescriptor);
    const parsed = JSON.parse(text) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      schema: "liveloki.widget",
      version: 1,
      type: "note",
      config: { text: "hello" },
    });
  });

  it("rejects unknown pasted widget types", () => {
    const result = createWidgetFromClipboard(
      JSON.stringify({ schema: "liveloki.widget", version: 1, type: "missing" }),
      getDescriptor,
    );

    expect(result).toMatchObject({ ok: false, error: "Unknown widget type: missing" });
  });

  it("creates a new widget id when pasting", () => {
    const result = createWidgetFromClipboard(
      serializeWidgetForClipboard(noteWidget, noteDescriptor),
      getDescriptor,
    );

    expect(result.ok).toEqual(true);
    expect(result.widget?.type).toEqual("note");
    expect(result.widget?.id).not.toEqual("note-1");
  });

  it("clamps pasted grid dimensions to dashboard-safe bounds", () => {
    const result = createWidgetFromClipboard(
      JSON.stringify({
        schema: "liveloki.widget",
        version: 1,
        type: "note",
        size: { w: 999, h: -4, minW: 999, minH: -2 },
        config: { text: "oversized" },
      }),
      getDescriptor,
    );

    expect(result.widget?.gridPosition).toMatchObject({
      w: 48,
      h: 1,
      minW: 48,
      minH: 1,
    });
  });

  it("redacts video credentials from copied config", () => {
    const text = serializeWidgetForClipboard(
      {
        id: "video-1",
        type: "rtmp-video",
        gridPosition: { x: 0, y: 0, w: 6, h: 5 },
        config: {
          sourceUrl:
            "https://user:secret@example.com/live?token=abc&signature=def&view=main&secret=ghi#secret-fragment",
          username: "user",
          password: "secret",
        },
      },
      rtmpVideoDescriptor,
    );

    expect(text).not.toContain("secret");
    expect(text).not.toContain("abc");
    expect(text).not.toContain("def");
    expect(text).not.toContain("ghi");
    expect(text).not.toContain("user:secret");
    expect(JSON.parse(text)).toMatchObject({
      config: { sourceUrl: "https://example.com/live?view=main", username: "", password: "" },
    });
  });

  it("redacts external embed secrets from copied config", () => {
    const text = serializeWidgetForClipboard(
      {
        id: "embed-1",
        type: "external-embed",
        gridPosition: { x: 0, y: 0, w: 6, h: 5 },
        config: {
          url: "https://user:secret@example.com/page?token=abc&view=main#private",
        },
      },
      externalEmbedDescriptor,
    );

    expect(text).not.toContain("secret");
    expect(text).not.toContain("token=abc");
    expect(text).not.toContain("private");
    expect(JSON.parse(text)).toMatchObject({
      config: { url: "https://example.com/page?view=main" },
    });
  });
});
