import "ol/ol.css";

import { Button, FormGroup, InputGroup } from "@blueprintjs/core";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import { fromLonLat, toLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style, Text as TextStyle } from "ol/style";
import View from "ol/View";
import { useEffect, useMemo, useRef, useState } from "react";

import { useBattlelogEvents } from "../../battlelog/event-data";
import { useEventDetailStore } from "../../battlelog/event-detail-store";
import { useWidgetParams } from "../../hooks/use-widget-params";
import type { ConfigPanelProps, Event, WidgetDescriptor, WidgetProps } from "../../types";
import { publishTakMarker, readBoolean, readRefreshMs, type TakMarker, useTakMarkers } from "./tak-markers";

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

export function createTakMarkerFeature(marker: TakMarker) {
  const feature = new Feature({
    geometry: new Point(fromLonLat([marker.lng, marker.lat])),
    takUid: marker.uid,
    name: marker.callsign,
  });
  feature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: "#38bdf8" }),
        stroke: new Stroke({ color: "#082f49", width: 2 }),
      }),
      text: new TextStyle({
        text: marker.callsign,
        offsetY: -16,
        font: "12px sans-serif",
        fill: new Fill({ color: "#e0f2fe" }),
        stroke: new Stroke({ color: "#082f49", width: 3 }),
      }),
    }),
  );
  return feature;
}

function WeatherMapWidget({ config, isEditMode }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const eventVectorSourceRef = useRef<VectorSource | null>(null);
  const takVectorSourceRef = useRef<VectorSource | null>(null);
  const addTakModeRef = useRef(false);
  const [addTakMode, setAddTakMode] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const openEvent = useEventDetailStore((state) => state.openEvent);
  const { selectedItem, setSelectedItem } = useWidgetParams();
  const { data: events, error, isLoading } = useBattlelogEvents();
  const showTakMarkers = readBoolean(config.showTakMarkers, true);
  const takRefreshMs = readRefreshMs(config.takRefreshMs);
  const {
    data: takSnapshot,
    error: takError,
    isLoading: takIsLoading,
    mutate: refreshTakMarkers,
  } = useTakMarkers(showTakMarkers, takRefreshMs);

  const center = useMemo(() => {
    const lng = readNumber(config.lng, 22.24);
    const lat = readNumber(config.lat, 60.45);
    return fromLonLat([lng, lat]);
  }, [config.lat, config.lng]);
  const zoom = readNumber(config.zoom, 5);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const eventVectorSource = new VectorSource();
    eventVectorSourceRef.current = eventVectorSource;
    const eventVectorLayer = new VectorLayer({ source: eventVectorSource });
    const takVectorSource = new VectorSource();
    takVectorSourceRef.current = takVectorSource;
    const takVectorLayer = new VectorLayer({ source: takVectorSource });

    const map = new Map({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), eventVectorLayer, takVectorLayer],
      view: new View({ center, zoom }),
    });

    map.on("singleclick", (event) => {
      if (addTakModeRef.current) {
        const [lng, lat] = toLonLat(event.coordinate);
        const callsign = globalThis.prompt("TAK marker name", "BattleLog marker")?.trim();
        if (!callsign) return;
        setIsPublishing(true);
        setPublishError(null);
        publishTakMarker({
          callsign,
          lat,
          lng,
          remarks: "Created from BattleLog",
          type: "a-n-G",
        })
          .then(() => {
            setAddTakMode(false);
            addTakModeRef.current = false;
            void refreshTakMarkers();
          })
          .catch((error_) => {
            setPublishError(error_ instanceof Error ? error_.message : String(error_));
          })
          .finally(() => {
            setIsPublishing(false);
          });
        return;
      }

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
      eventVectorSourceRef.current = null;
      takVectorSourceRef.current = null;
    };
  }, [center, openEvent, refreshTakMarkers, setSelectedItem, zoom]);

  useEffect(() => {
    addTakModeRef.current = addTakMode;
  }, [addTakMode]);

  useEffect(() => {
    mapRef.current?.getView().setCenter(center);
    mapRef.current?.getView().setZoom(zoom);
  }, [center, zoom]);

  useEffect(() => {
    const source = eventVectorSourceRef.current;
    if (!source) return;
    source.clear();
    source.addFeatures(
      (events ?? [])
        .filter(eventHasCoordinates)
        .map((event) => createEventFeature(event, String(event.id) === selectedItem)),
    );
  }, [events, selectedItem]);

  useEffect(() => {
    const source = takVectorSourceRef.current;
    if (!source) return;
    source.clear();
    if (!showTakMarkers) return;
    source.addFeatures((takSnapshot?.markers ?? []).map(createTakMarkerFeature));
  }, [showTakMarkers, takSnapshot?.markers]);

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
      {showTakMarkers && takIsLoading && (
        <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          Loading TAK markers...
        </div>
      )}
      {showTakMarkers && (takError || (takSnapshot?.enabled && !takSnapshot.connected)) && (
        <div className="absolute bottom-2 right-2 max-w-64 rounded bg-black/70 px-2 py-1 text-xs text-[var(--color-warning)]">
          TAK markers degraded: {takError ? String(takError) : takSnapshot?.status}
        </div>
      )}
      {showTakMarkers && (
        <div className="absolute left-2 top-2 flex max-w-72 flex-col gap-2">
          <Button
            small
            intent={addTakMode ? "primary" : "none"}
            loading={isPublishing}
            onClick={() => {
              const next = !addTakMode;
              setAddTakMode(next);
              addTakModeRef.current = next;
              setPublishError(null);
            }}
          >
            {addTakMode ? "Click map to place TAK marker" : "Add TAK marker"}
          </Button>
          {publishError && (
            <div className="rounded bg-black/70 px-2 py-1 text-xs text-[var(--color-danger)]">
              TAK publish failed: {publishError}
            </div>
          )}
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
      <Button
        small
        onClick={() => onChange({ ...config, showTakMarkers: !readBoolean(config.showTakMarkers, true) })}
      >
        {readBoolean(config.showTakMarkers, true) ? "Hide" : "Show"} TAK markers
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
  defaultConfig: { lat: 60.45, lng: 22.24, zoom: 5, showTakMarkers: true, takRefreshMs: 1000 },
  component: WeatherMapWidget,
  configPanel: WeatherMapConfigPanel,
  needsScroll: false,
};
