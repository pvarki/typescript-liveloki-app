import "ol/ol.css";

import { Button, FormGroup, InputGroup } from "@blueprintjs/core";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OlMap from "ol/Map";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from "ol/style";
import View from "ol/View";
import { useEffect, useMemo, useRef } from "react";

import { useBattlelogEvents } from "../../battlelog/event-data";
import { useEventDetailStore } from "../../battlelog/event-detail-store";
import { useWidgetParams } from "../../hooks/use-widget-params";
import type { ConfigPanelProps, Event, WidgetDescriptor, WidgetProps } from "../../types";
import { DEFAULT_TRACK_TTL_MS } from "../air-surveillance/store";

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function eventHasCoordinates(
  event: Event,
): event is Event & { location_lat: number; location_lng: number } {
  return (
    typeof event.location_lat === "number" &&
    Number.isFinite(event.location_lat) &&
    typeof event.location_lng === "number" &&
    Number.isFinite(event.location_lng)
  );
}

function createEventFeature(
  event: Event & { location_lat: number; location_lng: number },
  selected: boolean,
) {
  const feature = new Feature({
    geometry: new Point(fromLonLat([event.location_lng, event.location_lat])),
    eventId: String(event.id),
    name: event.header,
  });
  feature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: selected ? 9 : 7,
        fill: new Fill({ color: selected ? "#f59e0b" : "#ec4899" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
    }),
  );
  return feature;
}

function isAirTrackEvent(event: Event): boolean {
  return event.keywords?.includes("air-track") ?? false;
}

interface AirTrackPoint {
  eventId: string;
  trackId: string;
  heading: number;
  lng: number;
  lat: number;
  capturedAt: number;
}

function extractAirTrackPoint(event: Event): AirTrackPoint | null {
  if (!eventHasCoordinates(event)) return null;
  if (!isAirTrackEvent(event)) return null;
  const trackKw = event.keywords.find((k) => k.startsWith("track:"));
  const headingKw = event.keywords.find((k) => k.startsWith("heading:"));
  if (!trackKw || !headingKw) return null;
  const heading = Number(headingKw.slice("heading:".length));
  if (!Number.isFinite(heading)) return null;
  return {
    eventId: String(event.id),
    trackId: trackKw.slice("track:".length),
    heading,
    lng: event.location_lng,
    lat: event.location_lat,
    capturedAt: Date.parse(event.event_time || event.creation_time || "") || 0,
  };
}

function groupAirTrackPoints(
  events: readonly Event[],
  ttlMs: number,
  now: number,
): Map<string, AirTrackPoint[]> {
  const cutoff = now - ttlMs;
  const groups = new Map<string, AirTrackPoint[]>();
  for (const event of events) {
    const point = extractAirTrackPoint(event);
    if (!point) continue;
    if (point.capturedAt < cutoff) continue;
    const arr = groups.get(point.trackId) ?? [];
    arr.push(point);
    groups.set(point.trackId, arr);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.capturedAt - b.capturedAt);
  }
  return groups;
}

const TRACK_COLOR = "236, 72, 153";        // pink-500 RGB
const TRACK_COLOR_SELECTED = "245, 158, 11"; // amber-500 RGB

function createAirTrackFeatures(points: readonly AirTrackPoint[], selected: string | null): Feature[] {
  const features: Feature[] = [];
  const n = points.length;
  if (n === 0) return features;

  const latest = points[n - 1];
  const isSelected = latest.eventId === selected;
  const rgb = isSelected ? TRACK_COLOR_SELECTED : TRACK_COLOR;

  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const opacity = 0.15 + 0.7 * ((i + 1) / n);
    const segment = new Feature({
      geometry: new LineString([fromLonLat([a.lng, a.lat]), fromLonLat([b.lng, b.lat])]),
    });
    segment.setStyle(
      new Style({
        stroke: new Stroke({ color: `rgba(${rgb}, ${opacity})`, width: 2 }),
      }),
    );
    features.push(segment);
  }

  for (let i = 0; i < n - 1; i++) {
    const p = points[i];
    const opacity = 0.15 + 0.5 * ((i + 1) / n);
    const f = new Feature({
      geometry: new Point(fromLonLat([p.lng, p.lat])),
      eventId: p.eventId,
    });
    f.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 3,
          fill: new Fill({ color: `rgba(${rgb}, ${opacity})` }),
        }),
      }),
    );
    features.push(f);
  }

  const arrow = new Feature({
    geometry: new Point(fromLonLat([latest.lng, latest.lat])),
    eventId: latest.eventId,
    name: `Air ${latest.trackId}`,
  });
  arrow.setStyle(
    new Style({
      image: new RegularShape({
        points: 3,
        radius: 11,
        rotation: (latest.heading * Math.PI) / 180,
        fill: new Fill({ color: `rgb(${rgb})` }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
      text: new Text({
        text: latest.trackId,
        offsetX: 14,
        textAlign: "left",
        font: "bold 12px sans-serif",
        fill: new Fill({ color: "#ffffff" }),
        stroke: new Stroke({ color: "#000000", width: 3 }),
      }),
    }),
  );
  features.push(arrow);

  return features;
}

function WeatherMapWidget({ config, isEditMode }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const openEvent = useEventDetailStore((state) => state.openEvent);
  const { selectedItem, setSelectedItem } = useWidgetParams();
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

    const map = new OlMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), vectorLayer],
      view: new View({ center, zoom }),
    });

    map.on("singleclick", (event) => {
      map.forEachFeatureAtPixel(event.pixel, (feature) => {
        const eventId = feature.get("eventId") as string | undefined;
        if (eventId) {
          setSelectedItem(eventId);
          openEvent(eventId);
        }
      });
    });

    mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      vectorSourceRef.current = null;
    };
  }, [center, openEvent, setSelectedItem, zoom]);

  useEffect(() => {
    mapRef.current?.getView().setCenter(center);
    mapRef.current?.getView().setZoom(zoom);
  }, [center, zoom]);

  useEffect(() => {
    const renderFeatures = () => {
      const source = vectorSourceRef.current;
      if (!source) return;
      source.clear();
      const all = events ?? [];
      source.addFeatures(
        all
          .filter((e) => !isAirTrackEvent(e))
          .filter(eventHasCoordinates)
          .map((event) => createEventFeature(event, String(event.id) === selectedItem)),
      );
      const trackGroups = groupAirTrackPoints(all.filter(isAirTrackEvent), DEFAULT_TRACK_TTL_MS, Date.now());
      for (const points of trackGroups.values()) {
        source.addFeatures(createAirTrackFeatures(points, selectedItem));
      }
    };
    renderFeatures();
    const interval = setInterval(renderFeatures, 30_000);
    return () => clearInterval(interval);
  }, [events, selectedItem]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ pointerEvents: isEditMode ? "none" : "auto" }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-sm text-white">
          Loading events...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4 text-center text-sm text-[var(--color-danger)]">
          Failed to load map events: {String(error)}
        </div>
      )}
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
        <InputGroup
          value={String(readNumber(config.lat, 60.45))}
          onChange={(event) => setNumber("lat", event.target.value)}
        />
      </FormGroup>
      <FormGroup label="Center longitude">
        <InputGroup
          value={String(readNumber(config.lng, 22.24))}
          onChange={(event) => setNumber("lng", event.target.value)}
        />
      </FormGroup>
      <FormGroup label="Zoom">
        <InputGroup
          value={String(readNumber(config.zoom, 5))}
          onChange={(event) => setNumber("zoom", event.target.value)}
        />
      </FormGroup>
      <Button small onClick={() => onChange({ ...config, lat: 60.45, lng: 22.24, zoom: 5 })}>
        Reset Finland view
      </Button>
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
