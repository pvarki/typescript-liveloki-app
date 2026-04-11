import { describe, expect, it } from "vitest";

import { getAvailableBaseLayers, getMapCoreConfig, resolveLayerUrl } from "../src/widgets/map/map-model";

describe("map model", () => {
  it("defaults to a static OpenStreetMap view", () => {
    expect(getMapCoreConfig({})).toMatchObject({
      lat: 60.45,
      lng: 22.24,
      zoom: 5,
      baseLayer: "osm",
      enablePanZoom: false,
    });
  });

  it("hides keyed providers when env keys are absent", () => {
    const layerIds = getAvailableBaseLayers({}).map((layer) => layer.id);

    expect(layerIds).toContain("osm");
    expect(layerIds).not.toContain("mapbox-light");
    expect(layerIds).not.toContain("thunderforest-outdoors");
  });

  it("includes keyed providers and resolves token URLs when env keys are present", () => {
    const env = { VITE_MAPBOX_TOKEN: "token value" };
    const layer = getAvailableBaseLayers(env).find((candidate) => candidate.id === "mapbox-light");

    expect(layer).toBeDefined();
    expect(layer ? resolveLayerUrl(layer, env) : null).toContain("access_token=token%20value");
  });

  it("clamps invalid coordinates and zoom", () => {
    expect(getMapCoreConfig({ lat: 999, lng: -999, zoom: 200 })).toMatchObject({
      lat: 90,
      lng: -180,
      zoom: 20,
    });
  });
});
