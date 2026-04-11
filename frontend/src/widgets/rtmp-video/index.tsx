import { Card, Checkbox, FormGroup, HTMLSelect, InputGroup } from "@blueprintjs/core";
import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import {
  buildBasicAuthHeader,
  buildVideoPlaybackUrl,
  DEFAULT_RTMP_VIDEO_CONFIG,
  getEffectivePlaybackMode,
  getRtmpVideoConfig,
  isBrowserPlayableVideoSource,
  isHlsSource,
  isRtmpSource,
} from "./rtmp-video-model";

function VideoElement({
  sourceUrl,
  nativeSourceUrl,
  authHeader,
  autoplay,
  muted,
  controls,
}: {
  sourceUrl: string;
  nativeSourceUrl: string;
  authHeader: string | null;
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    let cancelled = false;

    const playIfNeeded = () => {
      if (!autoplay || cancelled) return;

      void element.play().catch(() => {
        if (!cancelled) {
          setPlaybackError("Autoplay was blocked by the browser. Press play to start the stream.");
        }
      });
    };

    setPlaybackError(null);

    if (!isHlsSource(sourceUrl)) {
      element.src = nativeSourceUrl;
      element.load();
      playIfNeeded();
      return;
    }

    if (element.canPlayType("application/vnd.apple.mpegurl")) {
      element.src = nativeSourceUrl;
      element.load();
      playIfNeeded();
      return;
    }

    if (!Hls.isSupported()) {
      setPlaybackError("This browser cannot play HLS streams.");
      element.removeAttribute("src");
      element.load();
      return;
    }

    const hls = new Hls({
      xhrSetup: authHeader
        ? (xhr) => {
            xhr.setRequestHeader("Authorization", authHeader);
          }
        : undefined,
    });
    hls.loadSource(sourceUrl);
    hls.attachMedia(element);
    hls.on(Hls.Events.MANIFEST_PARSED, playIfNeeded);
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        setPlaybackError("HLS playback failed. Check the stream URL and server CORS settings.");
      }
    });

    return () => {
      cancelled = true;
      hls.destroy();
    };
  }, [authHeader, autoplay, nativeSourceUrl, sourceUrl]);

  return (
    <div className="relative min-h-0 flex-1">
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
        autoPlay={autoplay}
        muted={muted}
        controls={controls}
        playsInline
      />
      {playbackError && (
        <div className="absolute inset-x-3 bottom-3 rounded bg-black/80 p-2 text-xs text-white">
          {playbackError}
        </div>
      )}
    </div>
  );
}

function RtmpVideoWidget({ instanceId, config }: WidgetProps) {
  const video = getRtmpVideoConfig(config);
  const sourceUrl = buildVideoPlaybackUrl(video, instanceId);
  const nativeSourceUrl = sourceUrl;
  const authHeader = buildBasicAuthHeader(video);
  const playbackMode = getEffectivePlaybackMode(video);
  const isPlayable = playbackMode === "hls" || isBrowserPlayableVideoSource(sourceUrl);

  if (!sourceUrl) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <span className="text-sm text-[var(--color-muted-foreground)]">
          Configure a video source in widget settings.
        </span>
      </div>
    );
  }

  if (playbackMode === "embed") {
    return (
      <div className="flex h-full flex-col bg-black">
        {video.title && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground)]">
            {video.title}
          </div>
        )}
        <iframe
          className="min-h-0 flex-1 border-0 bg-black"
          src={nativeSourceUrl}
          title={video.title || "Video stream"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (!isPlayable) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Card className="max-w-sm text-sm">
          <p className="font-semibold">{video.title}</p>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            {isRtmpSource(sourceUrl)
              ? "Raw RTMP streams cannot be played directly by the browser. Use a browser-playable restream URL such as HLS (.m3u8) or MP4 for playback."
              : "This video source is not browser-playable."}
          </p>
          <p className="mt-2 break-all text-xs text-[var(--color-muted-foreground)]">{sourceUrl}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-black">
      {video.title && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground)]">
          {video.title}
        </div>
      )}
      <VideoElement
        sourceUrl={sourceUrl}
        nativeSourceUrl={nativeSourceUrl}
        authHeader={authHeader}
        autoplay={video.autoplay}
        muted={video.muted}
        controls={video.controls}
      />
    </div>
  );
}

function RtmpVideoConfigPanel({ config, onChange }: ConfigPanelProps) {
  const video = getRtmpVideoConfig(config);

  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Title">
        <InputGroup
          value={video.title}
          onChange={(event) => onChange({ ...video, title: event.target.value })}
        />
      </FormGroup>

      <FormGroup
        label="Video source"
        helperText="HLS (.m3u8) and regular browser video URLs play in the widget. RTMP URLs can be stored here, but need a restream/transcode endpoint."
      >
        <InputGroup
          placeholder="rtmp://server/app/stream or https://server/stream.m3u8"
          value={video.sourceUrl}
          onChange={(event) => onChange({ ...video, sourceUrl: event.target.value })}
        />
      </FormGroup>

      <FormGroup
        label="Playback mode"
        helperText="Use HLS for MediaMTX-style stream paths; it will request /index.m3u8 under this source URL."
      >
        <HTMLSelect
          fill
          value={video.playbackMode}
          onChange={(event) => onChange({ ...video, playbackMode: event.target.value })}
          options={[
            { label: "Auto-detect", value: "auto" },
            { label: "HLS playlist", value: "hls" },
            { label: "Direct video URL", value: "direct" },
            { label: "Embed page", value: "embed" },
          ]}
        />
      </FormGroup>

      <FormGroup
        label="Username"
        helperText="Optional. Added to playback URL as https://USERNAME@host/..."
      >
        <InputGroup
          value={video.username}
          onChange={(event) => onChange({ ...video, username: event.target.value })}
        />
      </FormGroup>

      <FormGroup
        label="Password"
        helperText="Optional. Added to playback URL as https://USERNAME:PASSWORD@host/..."
      >
        <InputGroup
          type="password"
          value={video.password}
          onChange={(event) => onChange({ ...video, password: event.target.value })}
        />
      </FormGroup>

      <Checkbox
        checked={video.autoplay}
        label="Autoplay"
        onChange={(event) => onChange({ ...video, autoplay: event.currentTarget.checked })}
      />
      <Checkbox
        checked={video.muted}
        label="Muted"
        onChange={(event) => onChange({ ...video, muted: event.currentTarget.checked })}
      />
      <Checkbox
        checked={video.controls}
        label="Show controls"
        onChange={(event) => onChange({ ...video, controls: event.currentTarget.checked })}
      />
    </div>
  );
}

export const rtmpVideoDescriptor: WidgetDescriptor = {
  type: "rtmp-video",
  name: "Video Stream",
  description: "Configurable RTMP/HLS/video stream display",
  icon: <span className="text-lg">▶</span>,
  defaultSize: { w: 6, h: 5, minW: 4, minH: 3 },
  defaultConfig: DEFAULT_RTMP_VIDEO_CONFIG,
  component: RtmpVideoWidget,
  configPanel: RtmpVideoConfigPanel,
  needsScroll: false,
};
