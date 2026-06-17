export interface ExternalEmbedConfig extends Record<string, unknown> {
  title: string;
  url: string;
  allowPointerInteraction: boolean;
  allowScripts: boolean;
  allowForms: boolean;
  allowSameOrigin: boolean;
  allowPopups: boolean;
  allowFullscreen: boolean;
  refreshSeconds: number;
}

export const DEFAULT_EXTERNAL_EMBED_CONFIG: ExternalEmbedConfig = {
  title: "External Embed",
  url: "",
  allowPointerInteraction: false,
  allowScripts: false,
  allowForms: false,
  allowSameOrigin: false,
  allowPopups: false,
  allowFullscreen: false,
  refreshSeconds: 0,
};

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

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readRefreshSeconds(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 10) return 0;
  return Math.min(3600, Math.round(value));
}

export function getExternalEmbedConfig(config: Record<string, unknown>): ExternalEmbedConfig {
  const allowScripts = readBoolean(config.allowScripts, DEFAULT_EXTERNAL_EMBED_CONFIG.allowScripts);
  const allowSameOrigin =
    !allowScripts && readBoolean(config.allowSameOrigin, DEFAULT_EXTERNAL_EMBED_CONFIG.allowSameOrigin);
  const url =
    typeof config.url === "string" ? sanitizeExternalEmbedUrl(config.url) : DEFAULT_EXTERNAL_EMBED_CONFIG.url;

  return {
    title: typeof config.title === "string" ? config.title : DEFAULT_EXTERNAL_EMBED_CONFIG.title,
    url,
    allowPointerInteraction: readBoolean(
      config.allowPointerInteraction,
      DEFAULT_EXTERNAL_EMBED_CONFIG.allowPointerInteraction,
    ),
    allowScripts,
    allowForms: readBoolean(config.allowForms, DEFAULT_EXTERNAL_EMBED_CONFIG.allowForms),
    allowSameOrigin,
    allowPopups: readBoolean(config.allowPopups, DEFAULT_EXTERNAL_EMBED_CONFIG.allowPopups),
    allowFullscreen: readBoolean(config.allowFullscreen, DEFAULT_EXTERNAL_EMBED_CONFIG.allowFullscreen),
    refreshSeconds: readRefreshSeconds(config.refreshSeconds),
  };
}

export function sanitizeExternalEmbedUrl(url: string): string {
  if (!url.trim()) return "";
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";

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
    return "";
  }
}

export function isAllowedEmbedUrl(url: string): boolean {
  return Boolean(sanitizeExternalEmbedUrl(url));
}

export function buildExternalEmbedSandbox(config: ExternalEmbedConfig): string {
  const tokens = [];
  if (config.allowScripts) tokens.push("allow-scripts");
  if (config.allowForms) tokens.push("allow-forms");
  if (config.allowSameOrigin) tokens.push("allow-same-origin");
  if (config.allowPopups) tokens.push("allow-popups");
  return tokens.join(" ");
}
