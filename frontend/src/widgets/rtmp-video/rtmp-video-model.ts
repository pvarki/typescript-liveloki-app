export type VideoPlaybackMode = "auto" | "hls" | "direct" | "embed";

export interface RtmpVideoWidgetConfig extends Record<string, unknown> {
  title: string;
  sourceUrl: string;
  username: string;
  password: string;
  playbackMode: VideoPlaybackMode;
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
}

export const DEFAULT_RTMP_VIDEO_CONFIG: RtmpVideoWidgetConfig = {
  title: "Video Stream",
  sourceUrl: "",
  username: "",
  password: "",
  playbackMode: "auto",
  autoplay: true,
  muted: true,
  controls: true,
};

function getPlaybackMode(value: unknown): VideoPlaybackMode {
  return value === "hls" || value === "direct" || value === "auto" ? value : "auto";
}

export function getRtmpVideoConfig(config: Record<string, unknown>): RtmpVideoWidgetConfig {
  return {
    title: typeof config.title === "string" ? config.title : DEFAULT_RTMP_VIDEO_CONFIG.title,
    sourceUrl: typeof config.sourceUrl === "string" ? config.sourceUrl : DEFAULT_RTMP_VIDEO_CONFIG.sourceUrl,
    username: typeof config.username === "string" ? config.username : DEFAULT_RTMP_VIDEO_CONFIG.username,
    password: typeof config.password === "string" ? config.password : DEFAULT_RTMP_VIDEO_CONFIG.password,
    playbackMode: getPlaybackMode(config.playbackMode),
    autoplay: typeof config.autoplay === "boolean" ? config.autoplay : DEFAULT_RTMP_VIDEO_CONFIG.autoplay,
    muted: typeof config.muted === "boolean" ? config.muted : DEFAULT_RTMP_VIDEO_CONFIG.muted,
    controls: typeof config.controls === "boolean" ? config.controls : DEFAULT_RTMP_VIDEO_CONFIG.controls,
  };
}

export function appendVideoCacheBuster(sourceUrl: string, instanceId?: string): string {
  if (!instanceId || !sourceUrl) return sourceUrl;

  try {
    const parsed = new URL(sourceUrl);
    parsed.searchParams.set("dashboardWidgetId", instanceId);
    return parsed.toString();
  } catch {
    return sourceUrl;
  }
}

export function buildVideoPlaybackUrl(config: RtmpVideoWidgetConfig, instanceId?: string): string {
  const sourceUrl = appendVideoCacheBuster(buildVideoSourceUrl(config), instanceId);
  if (!sourceUrl || (!config.username.trim() && !config.password)) return sourceUrl;

  try {
    const parsed = new URL(sourceUrl);
    if (config.username.trim()) {
      parsed.username = config.username.trim();
    }
    if (config.password) {
      parsed.password = config.password;
    }
    return parsed.toString();
  } catch {
    return sourceUrl;
  }
}

export function buildBasicAuthHeader(config: RtmpVideoWidgetConfig): string | null {
  const username = config.username.trim();
  if (!username) return null;

  return `Basic ${btoa(`${username}:${config.password}`)}`;
}

export function buildVideoSourceUrl(config: RtmpVideoWidgetConfig): string {
  const sourceUrl = config.sourceUrl.trim();
  if (!sourceUrl || config.playbackMode !== "hls" || isHlsSource(sourceUrl)) return sourceUrl;

  return `${sourceUrl.replace(/\/+$/, "")}/index.m3u8`;
}

const SECRET_QUERY_PARAMS = new Set([
  "access_token",
  "api_key",
  "apikey",
  "auth",
  "authorization",
  "key",
  "password",
  "secret",
  "sig",
  "signature",
  "token",
]);

function redactUrlCredentials(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";
    const searchParamKeys = [...parsed.searchParams.keys()];
    for (const key of searchParamKeys) {
      if (SECRET_QUERY_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return sourceUrl;
  }
}

export function redactRtmpVideoConfig(config: Record<string, unknown>): RtmpVideoWidgetConfig {
  const video = getRtmpVideoConfig(config);
  return {
    ...video,
    sourceUrl: redactUrlCredentials(video.sourceUrl),
    username: "",
    password: "",
  };
}

export function isRtmpSource(sourceUrl: string): boolean {
  return sourceUrl.trim().toLowerCase().startsWith("rtmp://");
}

export function isHlsSource(sourceUrl: string): boolean {
  const normalized = sourceUrl.trim().toLowerCase().split(/[?#]/)[0];
  return normalized.endsWith(".m3u8");
}

export function isDirectVideoSource(sourceUrl: string): boolean {
  const normalized = sourceUrl.trim().toLowerCase().split(/[?#]/)[0];
  return (
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".webm") ||
    normalized.endsWith(".ogv") ||
    normalized.endsWith(".ogg") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:")
  );
}

export function isBrowserPlayableVideoSource(sourceUrl: string): boolean {
  const normalized = sourceUrl.trim().toLowerCase();
  if (!normalized) return false;
  if (isRtmpSource(normalized)) return false;

  return isHlsSource(normalized) || isDirectVideoSource(normalized);
}

export function getEffectivePlaybackMode(config: RtmpVideoWidgetConfig): Exclude<VideoPlaybackMode, "auto"> {
  if (config.playbackMode !== "auto") return config.playbackMode;

  const sourceUrl = config.sourceUrl.trim();
  if (isHlsSource(sourceUrl)) return "hls";
  if (isDirectVideoSource(sourceUrl)) return "direct";
  return "hls";
}
