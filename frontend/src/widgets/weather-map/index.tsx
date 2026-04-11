import "ol/ol.css";

import { Button, FormGroup, InputGroup } from "@blueprintjs/core";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import View from "ol/View";
import { useEffect, useMemo, useRef } from "react";

import { useBattlelogEvents } from "../../battlelog/event-data";
import { useEventDetailStore } from "../../battlelog/event-detail-store";
import type { ConfigPanelProps, Event, WidgetDescriptor, WidgetProps } from "../../types";

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function eventHasCoordinates(event: Event): event is Event & { location_lat: number; location_lng: number } {
  return (
    typeof event.location_lat === "number" &&
    Number.isFinite(event.location_lat) &&
    typeof event.location_lng === "number" &&
    Number.isFinite(event.location_lng)
  );
}

function createEventFeature(event: Event & { location_lat: number; location_lng: number }) {
  const feature = new Feature({
    geometry: new Point(fromLonLat([event.location_lng, event.location_lat])),
    eventId: String(event.id),
    name: event.header,
  });
  feature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: "#ec4899" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
    }),
  );
  return feature;
}

function WeatherMapWidget({ config, isEditMode }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const openEvent = useEventDetailStore((state) => state.openEvent);
  const { data: events, error, isLoading } = useBattlelogEvents();

  const center = useMemo(() => {
    const lng = readNumber(config.lng, 22.24);
    const lat = readNumber(config.lat, 60.45);
    return fromLonLat([lng, lat]);
  }, [config.lat, config.lng]);
  const zoom = readNumber(config.zoom, 5);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;
    const vectorLayer = new VectorLayer({ source: vectorSource });

    const map = new Map({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), vectorLayer],
      view: new View({ center, zoom }),
    });

    map.on("singleclick", (event) => {
      map.forEachFeatureAtPixel(event.pixel, (feature) => {
        const eventId = feature.get("eventId") as string | undefined;
        if (eventId) openEvent(eventId);
      });
    });

    mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      vectorSourceRef.current = null;
    };
  }, [center, openEvent, zoom]);

  useEffect(() => {
    mapRef.current?.getView().setCenter(center);
    mapRef.current?.getView().setZoom(zoom);
  }, [center, zoom]);

  useEffect(() => {
    const source = vectorSourceRef.current;
    if (!source) return;
    source.clear();
    source.addFeatures((events ?? []).filter(eventHasCoordinates).map(createEventFeature));
  }, [events]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" style={{ pointerEvents: isEditMode ? "none" : "auto" }} />
      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-sm text-white">Loading events...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4 text-center text-sm text-[var(--color-danger)]">Failed to load map events: {String(error)}</div>}
    </div>
  );
}

function WeatherMapConfigPanel({ config, onChange }: ConfigPanelProps) {
  const setNumber = (key: "lat" | "lng" | "zoom", value: string) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) onChange({ ...config, [key]: parsed });
  };

  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Center latitude">
        <InputGroup value={String(readNumber(config.lat, 60.45))} onChange={(event) => setNumber("lat", event.target.value)} />
      </FormGroup>
      <FormGroup label="Center longitude">
        <InputGroup value={String(readNumber(config.lng, 22.24))} onChange={(event) => setNumber("lng", event.target.value)} />
      </FormGroup>
      <FormGroup label="Zoom">
        <InputGroup value={String(readNumber(config.zoom, 5))} onChange={(event) => setNumber("zoom", event.target.value)} />
      </FormGroup>
      <Button small onClick={() => onChange({ ...config, lat: 60.45, lng: 22.24, zoom: 5 })}>Reset Finland view</Button>
    </div>
  );
}

export const weatherMapDescriptor: WidgetDescriptor = {
  type: "weather-map",
  name: "Battlelog Map",
  description: "OpenLayers/OpenStreetMap view of Battlelog event locations",
  icon: <span className="text-lg">🗺</span>,
  defaultSize: { w: 8, h: 6, minW: 6, minH: 4 },
  defaultConfig: { lat: 60.45, lng: 22.24, zoom: 5 },
  component: WeatherMapWidget,
  configPanel: WeatherMapConfigPanel,
  needsScroll: false,
};
