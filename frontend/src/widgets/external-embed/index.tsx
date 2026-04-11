import { Checkbox, FormGroup, InputGroup, NumericInput } from "@blueprintjs/core";
import { useEffect, useState } from "react";

import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import {
  buildExternalEmbedSandbox,
  DEFAULT_EXTERNAL_EMBED_CONFIG,
  getExternalEmbedConfig,
  isAllowedEmbedUrl,
} from "./external-embed-model";

function ExternalEmbedWidget({ config, isEditMode }: WidgetProps) {
  const embed = getExternalEmbedConfig(config);
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    if (embed.refreshSeconds === 0) return;
    const interval = globalThis.setInterval(() => {
      setFrameKey((current) => current + 1);
    }, embed.refreshSeconds * 1000);
    return () => globalThis.clearInterval(interval);
  }, [embed.refreshSeconds]);

  if (!isAllowedEmbedUrl(embed.url)) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-[var(--color-muted-foreground)]">
        Configure an http(s) URL in widget settings.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-black">
      {embed.title && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground)]">
          {embed.title}
        </div>
      )}
      <iframe
        key={frameKey}
        className="min-h-0 flex-1 border-0 bg-black"
        src={embed.url}
        title={embed.title || "External embed"}
        sandbox={buildExternalEmbedSandbox(embed)}
        allow={embed.allowFullscreen ? "fullscreen" : undefined}
        allowFullScreen={embed.allowFullscreen}
        referrerPolicy="no-referrer"
        style={{ pointerEvents: isEditMode || !embed.allowPointerInteraction ? "none" : "auto" }}
      />
    </div>
  );
}

function ExternalEmbedConfigPanel({ config, onChange }: ConfigPanelProps) {
  const embed = getExternalEmbedConfig(config);
  const patch = (patchConfig: Partial<typeof embed>) => onChange({ ...embed, ...patchConfig });

  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Title">
        <InputGroup value={embed.title} onChange={(event) => patch({ title: event.target.value })} />
      </FormGroup>
      <FormGroup
        label="URL"
        helperText="Only http(s) URLs are accepted. Credentials should not be placed in embed URLs."
      >
        <InputGroup
          value={embed.url}
          onChange={(event) => patch({ url: event.target.value })}
          placeholder="https://example.com"
        />
      </FormGroup>
      <Checkbox
        checked={embed.allowPointerInteraction}
        label="Allow pointer interaction in view mode"
        onChange={(event) => patch({ allowPointerInteraction: event.currentTarget.checked })}
      />
      <Checkbox
        checked={embed.allowScripts}
        label="Sandbox: allow scripts"
        onChange={(event) => patch({ allowScripts: event.currentTarget.checked })}
      />
      <Checkbox
        checked={embed.allowForms}
        label="Sandbox: allow forms"
        onChange={(event) => patch({ allowForms: event.currentTarget.checked })}
      />
      <Checkbox
        checked={embed.allowSameOrigin}
        label="Sandbox: allow same-origin"
        onChange={(event) => patch({ allowSameOrigin: event.currentTarget.checked })}
      />
      <Checkbox
        checked={embed.allowPopups}
        label="Sandbox: allow popups"
        onChange={(event) => patch({ allowPopups: event.currentTarget.checked })}
      />
      <Checkbox
        checked={embed.allowFullscreen}
        label="Allow fullscreen"
        onChange={(event) => patch({ allowFullscreen: event.currentTarget.checked })}
      />
      <FormGroup
        label="Refresh interval (seconds)"
        helperText="0 disables refresh. Minimum active interval is 10 seconds."
      >
        <NumericInput
          fill
          min={0}
          max={3600}
          value={embed.refreshSeconds}
          onValueChange={(value) => patch({ refreshSeconds: Number.isFinite(value) ? value : 0 })}
        />
      </FormGroup>
    </div>
  );
}

export const externalEmbedDescriptor: WidgetDescriptor = {
  type: "external-embed",
  name: "External Embed",
  description: "Sandboxed iframe for external dashboards or pages",
  icon: <span className="text-lg">▣</span>,
  defaultSize: { w: 6, h: 5, minW: 4, minH: 3 },
  defaultConfig: DEFAULT_EXTERNAL_EMBED_CONFIG,
  component: ExternalEmbedWidget,
  configPanel: ExternalEmbedConfigPanel,
  toClipboardConfig: getExternalEmbedConfig,
  fromClipboardConfig: getExternalEmbedConfig,
  needsScroll: false,
};
