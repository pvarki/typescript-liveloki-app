import "ol/ol.css";

import { Checkbox, FormGroup, HTMLSelect, InputGroup } from "@blueprintjs/core";
import { defaults as defaultControls } from "ol/control/defaults";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import TileLayer from "ol/layer/Tile";
import Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import View from "ol/View";
import { useEffect, useMemo, useRef } from "react";

import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import {
  DEFAULT_MAP_CORE_CONFIG,
  getAvailableBaseLayers,
  getMapCoreConfig,
  resolveLayerUrl,
} from "./map-model";

const env = import.meta.env as Record<string, unknown>;

function createBaseLayer(layerId: string) {
  const layer = getAvailableBaseLayers(env).find((candidate) => candidate.id === layerId);
  if (!layer || layer.id === "osm") {
    return new TileLayer({ source: new OSM() });
  }

  const url = resolveLayerUrl(layer, env);
  return new TileLayer({
    source: new XYZ({
      url: url ?? undefined,
      attributions: layer.attribution,
    }),
  });
}

function MapWidget({ config }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const baseLayerRef = useRef<TileLayer | null>(null);
  const safeConfig = useMemo(() => getMapCoreConfig(config, env), [config]);
  const center = useMemo(
    () => fromLonLat([safeConfig.lng, safeConfig.lat]),
    [safeConfig.lat, safeConfig.lng],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const baseLayer = createBaseLayer(safeConfig.baseLayer);
    baseLayerRef.current = baseLayer;
    const map = new Map({
      target: containerRef.current,
      controls: defaultControls({ zoom: safeConfig.enablePanZoom, rotate: false }),
      interactions: defaultInteractions({
        altShiftDragRotate: false,
        pinchRotate: false,
        dragPan: safeConfig.enablePanZoom,
        mouseWheelZoom: safeConfig.enablePanZoom,
        doubleClickZoom: safeConfig.enablePanZoom,
        pinchZoom: safeConfig.enablePanZoom,
      }),
      layers: [baseLayer],
      view: new View({ center, zoom: safeConfig.zoom }),
    });

    mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      baseLayerRef.current = null;
    };
  }, [safeConfig.enablePanZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getView().setCenter(center);
    map.getView().setZoom(safeConfig.zoom);
  }, [center, safeConfig.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const currentBaseLayer = baseLayerRef.current;
    if (!map || !currentBaseLayer) return;

    const nextBaseLayer = createBaseLayer(safeConfig.baseLayer);
    map.removeLayer(currentBaseLayer);
    map.getLayers().insertAt(0, nextBaseLayer);
    baseLayerRef.current = nextBaseLayer;
  }, [safeConfig.baseLayer]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function MapConfigPanel({ config, onChange }: ConfigPanelProps) {
  const safeConfig = getMapCoreConfig(config, env);
  const availableLayers = getAvailableBaseLayers(env);
  const setNumber = (key: "lat" | "lng" | "zoom", value: string) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) onChange({ ...safeConfig, [key]: parsed });
  };

  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Center latitude">
        <InputGroup
          value={String(safeConfig.lat)}
          onChange={(event) => setNumber("lat", event.target.value)}
        />
      </FormGroup>
      <FormGroup label="Center longitude">
        <InputGroup
          value={String(safeConfig.lng)}
          onChange={(event) => setNumber("lng", event.target.value)}
        />
      </FormGroup>
      <FormGroup label="Zoom">
        <InputGroup
          value={String(safeConfig.zoom)}
          onChange={(event) => setNumber("zoom", event.target.value)}
        />
      </FormGroup>
      <FormGroup label="Base layer">
        <HTMLSelect
          fill
          value={safeConfig.baseLayer}
          onChange={(event) => onChange({ ...safeConfig, baseLayer: event.currentTarget.value })}
          options={availableLayers.map((layer) => ({ label: layer.name, value: layer.id }))}
        />
      </FormGroup>
      <Checkbox
        checked={safeConfig.enablePanZoom}
        label="Enable pan and zoom"
        onChange={(event) => onChange({ ...safeConfig, enablePanZoom: event.currentTarget.checked })}
      />
    </div>
  );
}

export const mapDescriptor: WidgetDescriptor = {
  type: "map",
  name: "Map",
  description: "Configurable OpenLayers map shell",
  icon: <span className="text-lg">◎</span>,
  defaultSize: { w: 12, h: 8, minW: 4, minH: 3 },
  defaultConfig: DEFAULT_MAP_CORE_CONFIG,
  component: MapWidget,
  configPanel: MapConfigPanel,
  needsScroll: false,
};
