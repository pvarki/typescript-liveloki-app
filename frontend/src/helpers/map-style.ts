export default {
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", // TODO: self-host
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#111",
      },
      layout: {
        visibility: "visible",
      },
      maxzoom: 24,
    },
    {
      id: "coastline",
      type: "line",
      paint: {
        "line-blur": 0.5,
        "line-color": "#198EC8",
        "line-width": 2,
      },
      filter: ["all"],
      source: "maplibre",
      maxzoom: 24,
      minzoom: 0,
      "source-layer": "countries",
    },
    {
      id: "countries-boundary",
      type: "line",
      paint: {
        "line-color": "rgba(255, 255, 255, 1)",
        "line-width": {
          stops: [
            [1, 1],
            [6, 2],
            [14, 6],
            [22, 12],
          ],
        },
        "line-opacity": {
          stops: [
            [3, 0.5],
            [6, 1],
          ],
        },
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "visible",
      },
      source: "maplibre",
      maxzoom: 24,
      "source-layer": "countries",
    },
    {
      id: "countries-label",
      type: "symbol",
      paint: {
        "text-color": "#d09551",
        "text-halo-blur": {
          stops: [
            [2, 0.2],
            [6, 0],
          ],
        },
        "text-halo-color": "#000",
        "text-halo-width": {
          stops: [
            [2, 1],
            [6, 1.6],
          ],
        },
      },
      filter: ["all"],
      layout: {
        "text-font": ["Open Sans Semibold"],
        "text-size": {
          stops: [
            [2, 14],
            [4, 18],
            [6, 20],
          ],
        },
        "text-field": {
          stops: [
            [2, "{ABBREV}"],
            [4, "{NAME}"],
          ],
        },
        visibility: "visible",
        "text-max-width": 10,
      },
      source: "maplibre",
      maxzoom: 24,
      minzoom: 2,
      "source-layer": "centroids",
    },
  ],
  bearing: 0,
  sources: {
    maplibre: {
      url: "https://demotiles.maplibre.org/tiles/tiles.json", // TODO: self-host
      type: "vector",
    },
  },
  version: 8,
};
