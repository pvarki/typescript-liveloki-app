import { describe, expect, it } from "vitest";

import {
  buildExternalEmbedSandbox,
  DEFAULT_EXTERNAL_EMBED_CONFIG,
  getExternalEmbedConfig,
  isAllowedEmbedUrl,
  sanitizeExternalEmbedUrl,
} from "../src/widgets/external-embed/external-embed-model";

describe("external embed model", () => {
  it("defaults to a locked-down iframe", () => {
    const config = getExternalEmbedConfig({});

    expect(config).toEqual(DEFAULT_EXTERNAL_EMBED_CONFIG);
    expect(buildExternalEmbedSandbox(config)).toEqual("");
  });

  it("allows only http(s) embed URLs", () => {
    expect(isAllowedEmbedUrl("https://example.com")).toEqual(true);
    expect(isAllowedEmbedUrl("http://example.com")).toEqual(true);
    expect(isAllowedEmbedUrl("javascript:alert(1)")).toEqual(false);
    expect(isAllowedEmbedUrl("not a url")).toEqual(false);
  });

  it("redacts credentials, secret query params, and fragments from embed URLs", () => {
    expect(
      sanitizeExternalEmbedUrl("https://user:secret@example.com/path?token=abc&view=main&signature=sig#frag"),
    ).toEqual("https://example.com/path?view=main");
    expect(
      getExternalEmbedConfig({
        url: "https://user:secret@example.com/path?token=abc&view=main#frag",
      }).url,
    ).toEqual("https://example.com/path?view=main");
  });

  it("builds explicit sandbox relaxations without unsafe script plus same-origin pairing", () => {
    expect(
      buildExternalEmbedSandbox(
        getExternalEmbedConfig({
          allowScripts: true,
          allowForms: true,
          allowSameOrigin: true,
          allowPopups: true,
        }),
      ),
    ).toEqual("allow-scripts allow-forms allow-popups");
  });

  it("allows same-origin only when scripts are not enabled", () => {
    expect(buildExternalEmbedSandbox(getExternalEmbedConfig({ allowSameOrigin: true }))).toEqual(
      "allow-same-origin",
    );
  });

  it("normalizes refresh intervals", () => {
    expect(getExternalEmbedConfig({ refreshSeconds: 5 }).refreshSeconds).toEqual(0);
    expect(getExternalEmbedConfig({ refreshSeconds: 30.4 }).refreshSeconds).toEqual(30);
    expect(getExternalEmbedConfig({ refreshSeconds: 9999 }).refreshSeconds).toEqual(3600);
  });
});
