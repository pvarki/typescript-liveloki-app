import { describe, expect, it } from "vitest";

import { buildNotificationId, getNotificationDeliveryStrategy, upsertOverdueNotification } from "../src/notifications/notification-policy";
import { buildVideoPlaybackUrl, getEffectivePlaybackMode, getRtmpVideoConfig, isBrowserPlayableVideoSource } from "../src/widgets/rtmp-video/rtmp-video-model";
import { parseRelativeDuration, resolveSameDayAbsoluteTime, startTimer } from "../src/widgets/timer/timer-model";

describe("timer model", () => {
  it("parses relative duration and rejects past absolute same-day time", () => {
    expect(parseRelativeDuration("1h 30m")).toMatchObject({ ok: true, milliseconds: 5_400_000 });
    expect(resolveSameDayAbsoluteTime("09:00", new Date("2026-04-11T10:00:00"))).toMatchObject({ ok: false });
  });

  it("starts a relative timer with an absolute end timestamp", () => {
    const result = startTimer(
      {
        mode: "relative",
        relativeInput: "30 minutes",
        absoluteTime: "",
        endAt: null,
        startedAt: null,
        status: "idle",
        lastHandledAt: null,
        lastNotificationId: null,
      },
      new Date("2026-04-11T10:00:00Z"),
    );

    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.config.endAt).toEqual("2026-04-11T10:30:00.000Z");
  });
});

describe("notification policy", () => {
  const payload = {
    dashboardId: "dashboard-1",
    sourceType: "timer",
    sourceId: "timer-1",
    title: "Timer finished",
    body: "Done",
    dueAt: "2026-04-11T10:30:00.000Z",
  };

  it("builds stable ids and queues overdue notifications once", () => {
    expect(getNotificationDeliveryStrategy("granted")).toEqual("deliver");
    expect(getNotificationDeliveryStrategy("denied")).toEqual("queue");

    const queued = upsertOverdueNotification([], payload, "2026-04-11T10:31:00.000Z");
    expect(queued).toHaveLength(1);
    expect(queued[0].id).toEqual(buildNotificationId(payload));
    expect(upsertOverdueNotification(queued, payload, "2026-04-11T10:32:00.000Z")).toHaveLength(1);
  });
});

describe("RTMP video model", () => {
  it("normalizes config and produces HLS playback URLs", () => {
    const config = getRtmpVideoConfig({ sourceUrl: "https://example.com/live", playbackMode: "hls" });

    expect(buildVideoPlaybackUrl(config)).toEqual("https://example.com/live/index.m3u8");
    expect(getEffectivePlaybackMode(config)).toEqual("hls");
    expect(isBrowserPlayableVideoSource("https://example.com/live/index.m3u8")).toEqual(true);
  });
});
