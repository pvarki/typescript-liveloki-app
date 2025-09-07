import { useEffect, useRef } from "react";
import type { LngLatData } from "../types.ts";

// OpenLayers + mml-map
import Map from "ol/Map.js";
import View from "ol/View.js";
import { fromLonLat, toLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import Style from "ol/style/Style.js";
import Icon from "ol/style/Icon.js";
import "ol/ol.css";

import { loadCapabilities } from "../../mml-map/src/map/init.js";
import { createTileLayerFromList } from "../../mml-map/src/map/layers.js";
import { hardcodedLayers, mapboxAccessToken } from "../../mml-map/src/config/constants.js";

type MapPickerWidgetProps = { onPick: (location: LngLatData) => void; selected?: LngLatData };

export function MapPickerWidget({ onPick, selected }: MapPickerWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      target: containerRef.current,
      layers: [],
      view: new View({ center: fromLonLat([22.24, 60.45]), zoom: 4 }),
      controls: [],
    });
    mapRef.current = map;

    loadCapabilities()
      .then((result) => {
        const baseLayer = createTileLayerFromList(result, hardcodedLayers[1].id, null, mapboxAccessToken);
        map.addLayer(baseLayer);
      })
      .catch(() => {});

    const markerSource = new VectorSource();
    const markerLayer = new VectorLayer({ source: markerSource, zIndex: 300 });
    markerLayerRef.current = markerLayer;
    map.addLayer(markerLayer);

    function onClick(evt: any) {
      const coordinate: any = map.getEventCoordinate(evt.originalEvent);
      if (!coordinate || coordinate.length < 2) return;
      let lngLat: number[] | null = null;
      try { lngLat = toLonLat(coordinate as number[]); } catch { lngLat = null; }
      if (lngLat && lngLat.length >= 2) onPick({ lng: lngLat[0], lat: lngLat[1] });
    }
    map.on("singleclick", onClick);

    return () => {
      map.un("singleclick", onClick);
      map.setTarget(undefined);
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;
    const source = markerLayer.getSource()!;
    source.clear();
    if (selected) {
      const feature = new Feature({ geometry: new Point(fromLonLat([selected.lng, selected.lat])) });
      const svg = encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C6.48 0 2 4.48 2 10c0 7.5 10 22 10 22s10-14.5 10-22C22 4.48 17.52 0 12 0z" fill="#f472b6" stroke="black" stroke-width="1"/></svg>'
      );
      feature.setStyle(new Style({ image: new Icon({ src: `data:image/svg+xml;utf8,${svg}`, anchor: [0.5, 1] }) }));
      source.addFeature(feature);
      map.getView().animate({ center: fromLonLat([selected.lng, selected.lat]), zoom: 8, duration: 250 });
    }
  }, [selected]);

  return <div ref={containerRef} style={{ width: "100%", height: "500px" }} />;
}
