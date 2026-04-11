export interface MapCoreConfig extends Record<string, unknown> {
  lat: number;
  lng: number;
  zoom: number;
  baseLayer: string;
  enablePanZoom: boolean;
}

export interface MapBaseLayer {
  id: string;
  name: string;
  url?: string;
  attribution?: string;
  requiredEnvKey?: string;
}

export const DEFAULT_MAP_CORE_CONFIG: MapCoreConfig = {
  lat: 60.45,
  lng: 22.24,
  zoom: 5,
  baseLayer: "osm",
  enablePanZoom: false,
};

export const MAP_BASE_LAYERS: readonly MapBaseLayer[] = [
  { id: "osm", name: "OpenStreetMap" },
  {
    id: "opentopomap",
    name: "OpenTopoMap",
    url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
  },
  {
    id: "cartodb-dark",
    name: "CartoDB Dark",
    url: "https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: "© CARTO © OpenStreetMap contributors",
  },
  {
    id: "mapbox-light",
    name: "Mapbox Light",
    url: "https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token={token}",
    attribution: "© Mapbox © OpenStreetMap contributors",
    requiredEnvKey: "VITE_MAPBOX_TOKEN",
  },
  {
    id: "thunderforest-outdoors",
    name: "Thunderforest Outdoors",
    url: "https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={token}",
    attribution: "© Thunderforest © OpenStreetMap contributors",
    requiredEnvKey: "VITE_THUNDERFOREST_KEY",
  },
];

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readEnv(env: Record<string, unknown>, key: string): string | null {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getAvailableBaseLayers(env: Record<string, unknown>): MapBaseLayer[] {
  return MAP_BASE_LAYERS.filter((layer) => !layer.requiredEnvKey || readEnv(env, layer.requiredEnvKey));
}

export function getMapCoreConfig(
  config: Record<string, unknown>,
  env: Record<string, unknown> = {},
): MapCoreConfig {
  const available = getAvailableBaseLayers(env);
  const requestedLayer = typeof config.baseLayer === "string" ? config.baseLayer : "";
  const baseLayer = available.some((layer) => layer.id === requestedLayer)
    ? requestedLayer
    : DEFAULT_MAP_CORE_CONFIG.baseLayer;

  return {
    lat: readNumber(config.lat, DEFAULT_MAP_CORE_CONFIG.lat, -90, 90),
    lng: readNumber(config.lng, DEFAULT_MAP_CORE_CONFIG.lng, -180, 180),
    zoom: readNumber(config.zoom, DEFAULT_MAP_CORE_CONFIG.zoom, 1, 20),
    baseLayer,
    enablePanZoom:
      typeof config.enablePanZoom === "boolean"
        ? config.enablePanZoom
        : DEFAULT_MAP_CORE_CONFIG.enablePanZoom,
  };
}

export function resolveLayerUrl(layer: MapBaseLayer, env: Record<string, unknown>): string | null {
  if (!layer.url) return null;
  if (!layer.requiredEnvKey) return layer.url;

  const token = readEnv(env, layer.requiredEnvKey);
  return token ? layer.url.replace("{token}", encodeURIComponent(token)) : null;
}
