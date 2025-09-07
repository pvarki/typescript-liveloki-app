import cx from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { EventCard } from "./EventCard.tsx";
import type { FilteredEvent } from "../types.ts";

// OpenLayers + mml-map imports
import Map from "ol/Map.js";
import View from "ol/View.js";
import { fromLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import Style from "ol/style/Style.js";
import Icon from "ol/style/Icon.js";
import Text from "ol/style/Text.js";
import "ol/ol.css";

import { loadCapabilities } from "../../mml-map/src/map/init.js";
import { createTileLayerFromList } from "../../mml-map/src/map/layers.js";
import { hardcodedLayers, mapboxAccessToken } from "../../mml-map/src/config/constants.js";
import { createLayerSelectorDropdown } from "../../mml-map/src/ui/layerSelector.js";
import { mountOverlaySelectors } from "../../mml-map/src/ui/overlayDropdown.js";
import { fetchOverlayCapabilities } from "../../mml-map/src/overlays/fetchCapabilities.js";
import { updateAllOverlays } from "../../mml-map/src/map/overlays.js";
import { state as mapState } from "../../mml-map/src/state/store.js";
import { updatePermalinkWithFeatures } from "../../mml-map/src/map/permalink.js";
import { enableOverlayInfoClickHandlers } from "../../mml-map/src/map/overlayInfoClick.js";

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  const head = text.slice(0, Math.max(0, Math.floor(length / 2) - 1));
  const tail = text.slice(-Math.max(0, Math.ceil(length / 2) - 2));
  return `${head}…${tail}`;
}

export function EventsMap({ events }: { events: FilteredEvent[] }) {
  const [popupEvent, setPopupEvent] = useState<FilteredEvent | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const baseLayerRef = useRef<any>(null);

  const eventsWithLatLng = useMemo(
    () => events.filter((e) => e.location_lat !== null && e.location_lng !== null),
    [events],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      target: containerRef.current,
      layers: [],
      view: new View({ center: fromLonLat([24.94, 60.19]), zoom: 4 }),
      controls: [],
    });
    mapRef.current = map;

    // Base layer via mml-map
    loadCapabilities()
      .then(async (result) => {
        const baseLayer = createTileLayerFromList(result, hardcodedLayers[1].id, null, mapboxAccessToken);
        baseLayerRef.current = baseLayer;
        map.addLayer(baseLayer);

        // Save main map reference for overlay logic
        (mapState as any).map = map;
        (mapState as any).initialLayerIdx = 1;

        // Layer selector
        let layerSelectorDiv = createLayerSelectorDropdown(hardcodedLayers[1].id, function(newLayerId: string) {
          const newLayer = createTileLayerFromList(result, newLayerId, null, mapboxAccessToken);
          if (baseLayerRef.current) {
            map.removeLayer(baseLayerRef.current);
          }
          baseLayerRef.current = newLayer;
          map.getLayers().insertAt(0, newLayer);
          updatePermalinkWithFeatures();
        });
        if (containerRef.current) containerRef.current.appendChild(layerSelectorDiv);

        // Overlays: fetch capabilities, mount selectors, enable click info
        await fetchOverlayCapabilities();
        mapState.genericOverlayList = mapState.genericOverlayList || [];
        // Ensure overlay selectors are positioned within the map container
        if (containerRef.current) {
          containerRef.current.style.position = 'relative';
        }
        mountOverlaySelectors(containerRef.current!, updatePermalinkWithFeatures);
        updateAllOverlays();
        enableOverlayInfoClickHandlers();
      })
      .catch(() => {
        // ignore; map will still render if base fails later
      });

    // Markers layer
    const markersSource = new VectorSource();
    const markersLayer = new VectorLayer({ source: markersSource, zIndex: 200 });
    markersLayerRef.current = markersLayer;
    map.addLayer(markersLayer);

    // Click handler to open popup
    function onClick(evt: any) {
      let picked: any = null;
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        picked = feature as any;
        return true;
      });
      if (picked) {
        const rawId = picked.getId ? picked.getId() : picked.id;
        const id = typeof rawId === "string" ? Number.parseInt(rawId, 10) : rawId;
        if (typeof id === "number") {
          const ev = eventsWithLatLng.find((e) => e.id === id) || null;
          setPopupEvent(ev);
          return;
        }
        const propId = picked.get ? picked.get("eventId") : undefined;
        if (typeof propId === "number") {
          const ev = eventsWithLatLng.find((e) => e.id === propId) || null;
          setPopupEvent(ev);
          return;
        }
      }
      setPopupEvent(null);
    }
    map.on("singleclick", onClick);

    return () => {
      map.un("singleclick", onClick);
      map.setTarget(undefined);
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [containerRef]);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    const source = markersLayer.getSource()!;
    source.clear();

    eventsWithLatLng.forEach((ev) => {
      const feature = new Feature({ geometry: new Point(fromLonLat([ev.location_lng!, ev.location_lat!])) });
      feature.setId(ev.id);

      const color = ev.alert ? "#ef4444" : "#f472b6"; // red-500 or pink-400
      const svg = encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C6.48 0 2 4.48 2 10c0 7.5 10 22 10 22s10-14.5 10-22C22 4.48 17.52 0 12 0z" fill="${color}" stroke="black" stroke-width="1"/></svg>`,
      );
      const icon = new Icon({ src: `data:image/svg+xml;utf8,${svg}`, anchor: [0.5, 1] });
      const text = new Text({
        text: truncate(ev.header, 20),
        offsetY: -28,
        font: "12px Inter, sans-serif",
        fill: undefined,
        stroke: undefined,
        backgroundFill: undefined,
        backgroundStroke: undefined,
      });
      feature.setStyle(new Style({ image: icon, text }));
      source.addFeature(feature);
    });

    // Optionally fit view to markers
    if (eventsWithLatLng.length > 0) {
      try {
        const extent = source.getExtent();
        if (extent) {
          map.getView().fit(extent, { padding: [20, 20, 20, 20], maxZoom: 10, duration: 300 });
        }
      } catch {
        // no-op
      }
    }
  }, [eventsWithLatLng]);

  if (eventsWithLatLng.length === 0) {
    return <div className="text-center">No events with location data</div>;
  }

  return (
    <div className="gap-1 grid grid-cols-3">
      <div className={cx(popupEvent ? "col-span-2" : "col-span-3")}> 
        <div
          ref={containerRef}
          style={{ width: "100%", height: "calc(100vh - 200px)", minHeight: "500px", position: "relative", overflow: "hidden" }}
        />
      </div>
      {popupEvent ? <EventCard event={popupEvent} /> : null}
    </div>
  );
}
