import React from "react";
import { MdPlayArrow, MdStop } from "react-icons/md";
import useSWR, { mutate } from "swr";

import { getHarvesterConfig, getHarvesterPreview, updateHarvesterConfig } from "../helpers/api.ts";
import type { HarvesterConfig, HarvesterPreviewItem } from "../types.ts";

function formatPreviewTime(item: HarvesterPreviewItem): string {
  const { event, inserted_at } = item;
  if (event.createdAt) {
    return new Date(event.createdAt).toLocaleString();
  }
  if (event.time_us) {
    const numeric = typeof event.time_us === "string" ? Number.parseInt(event.time_us, 10) : event.time_us;
    if (Number.isFinite(numeric)) {
      const millis = Math.floor(numeric / 1000);
      return new Date(millis).toLocaleString();
    }
  }
  return new Date(inserted_at).toLocaleString();
}

export function HarvesterView() {
  const configSWR = useSWR<HarvesterConfig>("harvester-config", getHarvesterConfig, {
    refreshInterval: 10_000,
  });

  const [previewItems, setPreviewItems] = React.useState<HarvesterPreviewItem[] | null>(null);
  const [previewError, setPreviewError] = React.useState<unknown>(null);
  const [keywordsText, setKeywordsText] = React.useState("");

  React.useEffect(() => {
    if (configSWR.data) {
      setKeywordsText(configSWR.data.keywords.join(", "));
    }
  }, [configSWR.data?.keywords?.join(",")]);

  React.useEffect(() => {
    let cancelled = false;

    // Initial snapshot
    (async () => {
      try {
        const data = await getHarvesterPreview();
        if (!cancelled) {
          setPreviewItems(data);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error);
        }
      }
    })();

    // Live updates via SSE
    const eventSource = new EventSource("/api/harvester/preview/stream");

    eventSource.onmessage = (event) => {
      try {
        const item: HarvesterPreviewItem = JSON.parse(event.data);
        setPreviewItems((prev) => [item, ...(prev ?? [])].slice(0, 50));
      } catch {
        // ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      // keep existing items; SSE will auto-retry by default
    };

    return () => {
      cancelled = true;
      eventSource.close();
    };
  }, []);

  const onSave = async () => {
    const keywords = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const nextConfig: Partial<HarvesterConfig> = {
      enabled: configSWR.data?.enabled ?? false,
      keywords,
    };

    await updateHarvesterConfig(nextConfig);
    void mutate("harvester-config");
  };

  const onToggleEnabled = async () => {
    const nextEnabled = !(configSWR.data?.enabled ?? false);
    await updateHarvesterConfig({ enabled: nextEnabled });
    void mutate("harvester-config");
  };

  if (configSWR.error) {
    return <div>Error loading harvester config: {String(configSWR.error)}</div>;
  }

  const enabled = configSWR.data?.enabled ?? false;

  return (
    <div className="space-y-4">
      <section className="ll-card p-3 space-y-2">
        <h2 className="text-lg font-semibold">Harvester control</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="ll-btn" onClick={onToggleEnabled}>
            {enabled ? <MdStop className="inline mr-1" /> : <MdPlayArrow className="inline mr-1" />}
            {enabled ? "Disable harvester output" : "Enable harvester output"}
          </button>
          <span className={enabled ? "text-green-400" : "text-slate-400"}>
            {enabled ? "Sending matched events to Battlelog" : "Preview mode only (no events stored)"}
          </span>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="harvester-keywords">
            Keywords (comma separated)
          </label>
          <div className="flex gap-2">
            <input
              id="harvester-keywords"
              type="text"
              className="ll-input grow"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="e.g. ukraine, finland, nato"
            />
            <button type="button" className="ll-btn" onClick={onSave}>
              Save
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Changes apply live without restarting the harvester. Keywords are matched case-insensitively to Bluesky
            post text.
          </p>
        </div>
      </section>

      <section className="ll-card p-3 space-y-2">
        <h2 className="text-lg font-semibold">Harvester preview</h2>
        <p className="text-xs text-slate-400">
          This shows recent Bluesky posts matching the current keyword filter. When the harvester is disabled, events
          appear only here and are not written to the Battlelog database.
        </p>
        {previewError ? (
          <div>Error loading preview events: {String(previewError)}</div>
        ) : !previewItems ? (
          <div>Loading preview…</div>
        ) : previewItems.length === 0 ? (
          <div>No preview events yet.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto border border-slate-700 rounded-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-left">DID</th>
                  <th className="px-2 py-1 text-left">Matched keywords</th>
                  <th className="px-2 py-1 text-left">Text</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr key={item.id} className="odd:bg-slate-900 even:bg-slate-800/60 align-top">
                    <td className="px-2 py-1 whitespace-nowrap">{formatPreviewTime(item)}</td>
                    <td className="px-2 py-1 text-xs text-slate-400 whitespace-nowrap">{item.event.did ?? ""}</td>
                    <td className="px-2 py-1 text-xs">
                      {(item.event.matchedKeywords ?? []).join(", ")}
                    </td>
                    <td className="px-2 py-1 text-xs whitespace-pre-wrap">{item.event.text ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
