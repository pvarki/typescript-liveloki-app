import * as HoverCard from "@radix-ui/react-hover-card";
import { useEffect, useRef } from "react";
import { MdLocationPin } from "react-icons/md";

import type { FilteredEvent } from "../types.ts";

// OpenLayers + mml-map
import Map from "ol/Map.js";
import View from "ol/View.js";
import { fromLonLat } from "ol/proj";
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

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new Map({ target: ref.current, layers: [], view: new View({ center: fromLonLat([lng, lat]), zoom: 6 }), controls: [] });
    mapRef.current = map;
    loadCapabilities().then((result) => {
      const base = createTileLayerFromList(result, hardcodedLayers[1].id, null, mapboxAccessToken);
      map.addLayer(base);
    }).catch(() => {});
    const src = new VectorSource();
    const layer = new VectorLayer({ source: src, zIndex: 200 });
    const marker = new Feature({ geometry: new Point(fromLonLat([lng, lat])) });
    const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C6.48 0 2 4.48 2 10c0 7.5 10 22 10 22s10-14.5 10-22C22 4.48 17.52 0 12 0z" fill="#f472b6" stroke="black" stroke-width="1"/></svg>');
    marker.setStyle(new Style({ image: new Icon({ src: `data:image/svg+xml;utf8,${svg}`, anchor: [0.5, 1] }) }));
    src.addFeature(marker);
    map.addLayer(layer);
    return () => { map.setTarget(undefined); mapRef.current = null; };
  }, [lat, lng]);
  return <div ref={ref} style={{ width: "250px", height: "200px" }} />;
}

export function EventLocationLink({ event }: { event: FilteredEvent }) {
  const { location_lng: lng, location_lat: lat, location: text } = event;
  const hasLatLng = lat !== null && lng !== null;
  if (!text && !hasLatLng) return null;
  const content = text || (hasLatLng ? `${lat.toFixed(2)},\u00A0${lng.toFixed(2)}` : "");
  if (hasLatLng) {
    return (
      <HoverCard.Root>
        <HoverCard.Trigger asChild>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}`}
            target="_blank"
            rel="noreferrer"
            referrerPolicy="no-referrer"
          >
            <MdLocationPin className="inline h-6" />
            {content}
          </a>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content>
            <div className="flex border"><MiniMap lat={lat} lng={lng} /></div>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    );
  }
  return content;
}
