import { Button, FormGroup, InputGroup } from "@blueprintjs/core";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MdRadar } from "react-icons/md";

import { createEmptyBattlelogEvent, submitBattlelogEvents, useBattlelogEvents } from "../../battlelog/event-data";
import type { ConfigPanelProps, WidgetDescriptor, WidgetProps } from "../../types";
import { WidgetActionBar } from "../WidgetActionBar";
import { deriveActiveAlarm } from "./alarm";
import { DEFAULT_FINNISH_ZONE, formatGridString, gridToLatLng, parseGridString } from "./grid";
import { DEFAULT_TRACK_TTL_MS, useAirSurveillanceStore } from "./store";
import { assessThreat } from "./threat";
import type { AirTrack, AltitudeCode, BroadcastInput, OperatorLocation } from "./types";
import { useAirTrackVisibilityStore } from "./visibility";

const ALT_OPTIONS: Array<{ code: AltitudeCode; label: string; range: string }> = [
  { code: "pinnassa", label: "SURFACE", range: "< 300 m" },
  { code: "matalalla", label: "LOW", range: "300–3000 m" },
  { code: "korkealla", label: "HIGH", range: "> 3000 m" },
];

const COMPASS_DIRS: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

function parseHeading(raw: string): number | null {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;
  if (trimmed in COMPASS_DIRS) return COMPASS_DIRS[trimmed];
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return ((Math.round(n / 10) * 10) + 360) % 360;
}

const AIRCRAFT_TYPES = [
  "attack aircraft",
  "fighter",
  "bomber",
  "recon aircraft",
  "transport aircraft",
  "helicopter",
  "combat helicopter",
  "transport helicopter",
  "recon helicopter",
  "drone",
  "missile",
] as const;

const TYPE_ALIASES: Record<string, string> = {
  // English variants
  drones: "drone",
  // Finnish backward compat (operators may type these)
  drooni: "drone",
  droonit: "drone",
  drooneja: "drone",
  lennokki: "drone",
  lennokkeja: "drone",
  helikopteri: "helicopter",
  helikopterit: "helicopter",
  helikoptereita: "helicopter",
  rynnäkkökone: "attack aircraft",
  rynnäkkökoneita: "attack aircraft",
  hävittäjä: "fighter",
  hävittäjiä: "fighter",
  pommikone: "bomber",
  pommikoneita: "bomber",
  tiedustelukone: "recon aircraft",
  tiedustelukoneita: "recon aircraft",
  kuljetuskone: "transport aircraft",
  kuljetuskoneita: "transport aircraft",
  taisteluhelikopteri: "combat helicopter",
  taisteluhelikoptereita: "combat helicopter",
  kuljetushelikopteri: "transport helicopter",
  kuljetushelikoptereita: "transport helicopter",
  tiedusteluhelikopteri: "recon helicopter",
  tiedusteluhelikoptereita: "recon helicopter",
  ohjus: "missile",
  ohjuksia: "missile",
};

function canonicalizeType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return TYPE_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

interface AirSurveillanceConfig {
  operatorGrid?: string;
  operatorZone?: string;
  ttlMinutes?: number;
}

function getOperatorLocation(config: AirSurveillanceConfig): OperatorLocation | null {
  if (!config.operatorGrid) return null;
  const parsed = parseGridString(config.operatorGrid);
  if (!parsed) return null;
  const point = gridToLatLng(parsed.letters, parsed.e10, parsed.n10, config.operatorZone || DEFAULT_FINNISH_ZONE);
  if (!point) return null;
  return { gridLetters: parsed.letters, gridE10: parsed.e10, gridN10: parsed.n10, ...point };
}

function describeAltitude(alt: AltitudeCode): string {
  return alt.toUpperCase();
}

function describeThreat(tier: ReturnType<typeof assessThreat>): { label: string; className: string } {
  switch (tier) {
    case "inside_square": {
      return { label: "IN SQUARE", className: "bg-red-600 text-white" };
    }
    case "heading_toward": {
      return { label: "APPROACHING", className: "bg-orange-500 text-white" };
    }
    default: {
      return { label: "stable", className: "bg-[var(--color-field)] text-[var(--color-muted-foreground)]" };
    }
  }
}

function emptyBroadcast(): BroadcastInput {
  return {
    trackId: "",
    gridLetters: "",
    gridE10: 0,
    gridN10: 0,
    heading: 0,
    speed: 0,
    altitude: "matalalla",
    count: 1,
    type: "",
  };
}

function BroadcastForm({
  onSubmit,
  operatorZone,
}: {
  onSubmit: (track: AirTrack) => Promise<void> | void;
  operatorZone: string;
}) {
  const [draft, setDraft] = useState<BroadcastInput>(emptyBroadcast);
  const [gridRaw, setGridRaw] = useState("");
  const [headingRaw, setHeadingRaw] = useState("0");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const parsedGrid = parseGridString(gridRaw);
    if (!parsedGrid) {
      setError("Location format expected: 'MH 45'");
      return;
    }
    if (!draft.trackId.trim()) {
      setError("ID required");
      return;
    }
    const heading = parseHeading(headingRaw);
    if (heading === null) {
      setError("Heading expects degrees (0–350) or compass (N, NE, E, …)");
      return;
    }
    const point = gridToLatLng(parsedGrid.letters, parsedGrid.e10, parsedGrid.n10, operatorZone);
    if (!point) {
      setError(`Grid ${formatGridString(parsedGrid)} not resolvable in zone ${operatorZone}`);
      return;
    }
    const track: AirTrack = {
      id: `${draft.trackId}-${Date.now()}`,
      trackId: draft.trackId.trim(),
      gridLetters: parsedGrid.letters,
      gridE10: parsedGrid.e10,
      gridN10: parsedGrid.n10,
      heading,
      speed: draft.speed,
      altitude: draft.altitude,
      count: draft.count,
      type: canonicalizeType(draft.type) || "unknown",
      archived: false,
      lat: point.lat,
      lng: point.lng,
      capturedAt: Date.now(),
    };
    setError(null);
    void onSubmit(track);
    setDraft({ ...emptyBroadcast(), heading, speed: draft.speed, altitude: draft.altitude });
    setGridRaw("");
  }

  return (
    <form
      className="flex flex-col gap-2 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <FormGroup label="ID" className="!mb-0">
          <InputGroup
            autoFocus
            placeholder="3456"
            value={draft.trackId}
            onChange={(e) => setDraft({ ...draft, trackId: e.target.value })}
          />
        </FormGroup>
        <FormGroup label="LOCATION" className="!mb-0">
          <InputGroup
            placeholder="MH 45"
            value={gridRaw}
            onChange={(e) => setGridRaw(e.target.value)}
          />
        </FormGroup>
      </div>

      <FormGroup label="HEADING" className="!mb-0">
        <InputGroup
          list="air-track-headings"
          placeholder="350 or N / NE / E / SE / S / SW / W / NW"
          value={headingRaw}
          onChange={(e) => setHeadingRaw(e.target.value)}
        />
        <datalist id="air-track-headings">
          <option value="N">north</option>
          <option value="NE">northeast</option>
          <option value="E">east</option>
          <option value="SE">southeast</option>
          <option value="S">south</option>
          <option value="SW">southwest</option>
          <option value="W">west</option>
          <option value="NW">northwest</option>
        </datalist>
      </FormGroup>

      <FormGroup label="SPEED km/h" className="!mb-0">
        <InputGroup
          type="number"
          step={50}
          min={0}
          value={String(draft.speed)}
          onChange={(e) => setDraft({ ...draft, speed: Math.max(0, Number(e.target.value) || 0) })}
        />
      </FormGroup>

      <FormGroup label="ALTITUDE" className="!mb-0">
        <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Altitude">
          {ALT_OPTIONS.map((opt) => (
            <label key={opt.code} className="cursor-pointer">
              <input
                type="checkbox"
                tabIndex={0}
                checked={draft.altitude === opt.code}
                onChange={() => setDraft({ ...draft, altitude: opt.code })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setDraft({ ...draft, altitude: opt.code });
                  }
                }}
                aria-label={`Altitude ${opt.label}`}
                className="peer sr-only"
              />
              <div
                className={`rounded border px-2 py-1 text-xs text-center peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent)] peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[var(--color-background)] ${
                  draft.altitude === opt.code
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-field)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
                }`}
              >
                <div className="font-bold">{opt.label}</div>
                <div className="text-[10px] opacity-80">{opt.range}</div>
              </div>
            </label>
          ))}
        </div>
      </FormGroup>

      <FormGroup label="COUNT" className="!mb-0">
        <InputGroup
          type="number"
          min={1}
          value={String(draft.count)}
          onChange={(e) => setDraft({ ...draft, count: Math.max(1, Number(e.target.value) || 1) })}
        />
      </FormGroup>

      <FormGroup label="TYPE" className="!mb-0">
        <InputGroup
          list="air-track-types"
          placeholder="attack aircraft"
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        />
        <datalist id="air-track-types">
          {AIRCRAFT_TYPES.map((t) => <option key={t} value={t} />)}
        </datalist>
      </FormGroup>

      {error && (
        <div className="rounded border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-2 py-1 text-xs text-[var(--color-danger)]">
          {error}
        </div>
      )}
      <Button intent="primary" icon="add" text="Save track" type="submit" tabIndex={0} className="!mt-2" />
    </form>
  );
}

function TrackRow({
  track,
  user,
  now,
  onArchive,
  onRestore,
  onDelete,
}: {
  track: AirTrack;
  user: OperatorLocation | null;
  now: number;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}) {
  const tier = assessThreat(track, user);
  const badge = describeThreat(tier);
  const isVisible = useAirTrackVisibilityStore((s) => s.visibleTrackIds.has(track.trackId));
  const toggleVisibility = useAirTrackVisibilityStore((s) => s.toggle);
  const minutesAgo = Math.max(0, Math.floor((now - track.capturedAt) / 60_000));
  return (
    <div className={`border-b border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-field)] ${track.archived ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-baseline gap-2 truncate">
          <span className="font-mono text-sm font-semibold">{track.trackId}</span>
          <span className="font-mono text-[var(--color-muted-foreground)]">{track.gridLetters} {track.gridE10}{track.gridN10}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${badge.className}`}>{badge.label}</span>
          {!track.archived && (
            <Button
              minimal
              small
              icon={isVisible ? "eye-open" : "eye-off"}
              intent={isVisible ? "primary" : "none"}
              onClick={() => toggleVisibility(track.trackId)}
              aria-label={isVisible ? "Hide from map" : "Show on map"}
              title={isVisible ? "Hide from map" : "Show on map"}
            />
          )}
          {track.archived ? (
            <>
              <Button minimal small icon="undo" onClick={onRestore} aria-label="Restore" title="Restore to active" />
              <Button minimal small icon="trash" intent="danger" onClick={onDelete} aria-label="Delete permanently" title="Delete permanently" />
            </>
          ) : (
            <Button minimal small icon="archive" onClick={onArchive} aria-label="Archive" title="Archive track" />
          )}
        </div>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px] text-[var(--color-muted-foreground)]">
        <span>HDG {track.heading}°</span>
        <span>{track.speed} km/h</span>
        <span>{describeAltitude(track.altitude)}</span>
        <span>{track.count}× <span className="text-[var(--color-foreground)]">{track.type}</span></span>
        <span>{minutesAgo} min ago</span>
      </div>
    </div>
  );
}

function AirSurveillanceWidget({ config }: WidgetProps) {
  const cfg = config as AirSurveillanceConfig;
  const operator = useMemo(() => getOperatorLocation(cfg), [cfg]);
  const tracks = useAirSurveillanceStore((s) => s.tracks);
  const addOrReplaceTrack = useAirSurveillanceStore((s) => s.addOrReplaceTrack);
  const archiveTrack = useAirSurveillanceStore((s) => s.archiveTrack);
  const restoreTrack = useAirSurveillanceStore((s) => s.restoreTrack);
  const deleteTrack = useAirSurveillanceStore((s) => s.deleteTrack);
  const autoArchive = useAirSurveillanceStore((s) => s.autoArchive);
  const clearArchive = useAirSurveillanceStore((s) => s.clearArchive);
  const hideVisibility = useAirTrackVisibilityStore((s) => s.hide);
  const { data: events } = useBattlelogEvents();
  const activeAlarm = useMemo(() => deriveActiveAlarm(events), [events]);
  const ttlMs = (cfg.ttlMinutes ?? DEFAULT_TRACK_TTL_MS / 60_000) * 60_000;
  const [now, setNow] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  useEffect(() => {
    autoArchive(ttlMs);
    const interval = setInterval(() => {
      setNow(Date.now());
      autoArchive(ttlMs);
    }, 30_000);
    return () => clearInterval(interval);
  }, [autoArchive, ttlMs]);

  function handleArchive(track: AirTrack) {
    archiveTrack(track.id);
    hideVisibility(track.trackId);
  }
  function handleDeleteAll() {
    const archivedCount = tracks.filter((t) => t.archived).length;
    if (archivedCount === 0) return;
    if (!globalThis.confirm(`Delete ${archivedCount} archived tracks permanently?`)) return;
    clearArchive();
  }

  const tier3Track = useMemo(
    () => operator && tracks.find((t) => !t.archived && assessThreat(t, operator) === "inside_square"),
    [operator, tracks],
  );

  async function handleSubmitTrack(track: AirTrack) {
    addOrReplaceTrack(track);
    const payload = {
      ...createEmptyBattlelogEvent(),
      header: `Air track ${track.trackId}: ${track.gridLetters} ${track.gridE10}${track.gridN10} — ${track.count}× ${track.type}, ${track.heading}°/${track.speed} km/h, ${describeAltitude(track.altitude).toLowerCase()}`,
      source: "air-surveillance-widget",
      keywords: [
        "air-track",
        `track:${track.trackId}`,
        `heading:${track.heading}`,
        `speed:${track.speed}`,
        `alt:${track.altitude}`,
        `qty:${track.count}`,
        `type:${track.type.toLowerCase().replaceAll(/\s+/g, "-")}`,
      ],
      event_time: new Date(track.capturedAt).toISOString(),
      location: `${track.gridLetters} ${track.gridE10}${track.gridN10}`,
      location_lat: track.lat,
      location_lng: track.lng,
      author: "air-surveillance",
    };
    try {
      await submitBattlelogEvents([payload]);
      toast.success(`Track ${track.trackId} logged`);
    } catch (error) {
      console.error("Failed to log air track", error);
      toast.error("Track saved locally — server log failed");
    }
  }

  async function declareAlarm(state: "ilmahalytys" | "vaara_ohi", triggeringTrack?: AirTrack) {
    if (!operator) {
      toast.error("Set your location in the widget settings");
      return;
    }
    const payload = {
      ...createEmptyBattlelogEvent(),
      header: state === "ilmahalytys" ? "AIR ALARM" : "ALL CLEAR",
      source: "air-surveillance-widget",
      keywords: ["alarm", `alarm:${state}`],
      event_time: new Date().toISOString(),
      location: `${operator.gridLetters} ${operator.gridE10}${operator.gridN10}`,
      location_lat: operator.lat,
      location_lng: operator.lng,
      author: "air-surveillance",
      notes: triggeringTrack ? `Trigger: track ${triggeringTrack.trackId} (${triggeringTrack.type})` : undefined,
    };
    try {
      await submitBattlelogEvents([payload]);
      toast.success(state === "ilmahalytys" ? "AIR ALARM sounded" : "ALL CLEAR");
    } catch (error) {
      console.error("Failed to declare alarm", error);
      toast.error("Failed to log alarm");
    }
  }

  const activeTracks = tracks.filter((t) => !t.archived).toSorted((a, b) => b.capturedAt - a.capturedAt);
  const archivedTracks = tracks.filter((t) => t.archived).toSorted((a, b) => b.capturedAt - a.capturedAt);

  return (
    <div className="flex h-full flex-col">
      {!operator && (
        <div className="m-2 rounded border border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2 py-1 text-xs text-[var(--color-warning)]">
          Set your grid in the widget settings (e.g. <code className="font-mono">MH 45</code>) so threat assessment works.
        </div>
      )}
      {activeAlarm && (
        <div className={`m-2 rounded px-2 py-1 text-xs font-semibold uppercase ${activeAlarm.state === "ilmahalytys" ? "bg-red-700 text-white" : "bg-orange-600 text-white"}`}>
          {activeAlarm.state === "ilmahalytys" ? "AIR ALARM active" : "AIR WARNING active"}
        </div>
      )}
      {tier3Track && !activeAlarm && (
        <button
          type="button"
          onClick={() => declareAlarm("ilmahalytys", tier3Track)}
          className="m-2 rounded bg-red-600 px-3 py-3 text-center text-sm font-bold uppercase text-white shadow hover:bg-red-700"
        >
          Track {tier3Track.trackId} in your square — Sound AIR ALARM
        </button>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 w-1/2 shrink-0 overflow-y-auto border-r border-[var(--color-border)]">
          <BroadcastForm onSubmit={handleSubmitTrack} operatorZone={cfg.operatorZone || DEFAULT_FINNISH_ZONE} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-stretch border-b border-[var(--color-border)] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`flex-1 px-2 py-1 text-center font-semibold uppercase tracking-wider ${
                activeTab === "active"
                  ? "border-b-2 border-[var(--color-accent)] text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-field)]"
              }`}
            >
              Active ({activeTracks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("archived")}
              className={`flex-1 px-2 py-1 text-center font-semibold uppercase tracking-wider ${
                activeTab === "archived"
                  ? "border-b-2 border-[var(--color-accent)] text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-field)]"
              }`}
            >
              Archive ({archivedTracks.length})
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === "active" ? (
              activeTracks.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-[var(--color-muted-foreground)]">
                  No active tracks
                </div>
              ) : (
                activeTracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    user={operator}
                    now={now}
                    onArchive={() => handleArchive(track)}
                  />
                ))
              )
            ) : (
              <>
                {archivedTracks.length > 0 && (
                  <div className="flex justify-end border-b border-[var(--color-border)] px-2 py-1">
                    <Button
                      minimal
                      small
                      intent="danger"
                      icon="trash"
                      text="Clear archive"
                      onClick={handleDeleteAll}
                    />
                  </div>
                )}
                {archivedTracks.length === 0 ? (
                  <div className="px-2 py-3 text-center text-xs text-[var(--color-muted-foreground)]">
                    Archive empty
                  </div>
                ) : (
                  archivedTracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      user={operator}
                      now={now}
                      onRestore={() => restoreTrack(track.id)}
                      onDelete={() => deleteTrack(track.id)}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <WidgetActionBar
        primary={
          activeAlarm ? (
            <Button intent="warning" text="ALL CLEAR" fill small onClick={() => declareAlarm("vaara_ohi")} />
          ) : (
            <Button minimal text={`${activeTracks.length} active · ${archivedTracks.length} archived`} fill small disabled />
          )
        }
        secondary={
          operator ? (
            <Button minimal small icon="map-marker" text={`Self: ${operator.gridLetters} ${operator.gridE10}${operator.gridN10}`} disabled />
          ) : undefined
        }
      />
    </div>
  );
}

function AirSurveillanceConfigPanel({ config, onChange }: ConfigPanelProps) {
  const cfg = config as AirSurveillanceConfig;
  const [gridDraft, setGridDraft] = useState(cfg.operatorGrid ?? "");
  const [zoneDraft, setZoneDraft] = useState(cfg.operatorZone ?? DEFAULT_FINNISH_ZONE);
  const [ttlDraft, setTtlDraft] = useState(cfg.ttlMinutes ?? DEFAULT_TRACK_TTL_MS / 60_000);

  function commit() {
    onChange({
      ...config,
      operatorGrid: gridDraft.trim() || undefined,
      operatorZone: zoneDraft.trim() || DEFAULT_FINNISH_ZONE,
      ttlMinutes: Math.max(1, Number(ttlDraft) || DEFAULT_TRACK_TTL_MS / 60_000),
    });
  }

  const parsed = parseGridString(gridDraft);
  const preview = parsed ? gridToLatLng(parsed.letters, parsed.e10, parsed.n10, zoneDraft) : null;

  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Your grid">
        <InputGroup value={gridDraft} onChange={(e) => setGridDraft(e.target.value)} onBlur={commit} placeholder="MH 45" />
      </FormGroup>
      <FormGroup label="UTM zone">
        <InputGroup value={zoneDraft} onChange={(e) => setZoneDraft(e.target.value)} onBlur={commit} />
      </FormGroup>
      <FormGroup label="Archive after (min)">
        <InputGroup type="number" min={1} value={String(ttlDraft)} onChange={(e) => setTtlDraft(Number(e.target.value) || 15)} onBlur={commit} />
      </FormGroup>
      {parsed && preview && (
        <div className="rounded border border-[var(--color-border)] p-2 text-xs text-[var(--color-muted-foreground)]">
          {formatGridString(parsed)} → {preview.lat.toFixed(4)}°N, {preview.lng.toFixed(4)}°E
        </div>
      )}
      {gridDraft.trim() && !parsed && (
        <div className="rounded border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-2 text-xs text-[var(--color-danger)]">
          Grid format should be &quot;MH 45&quot; (two letters + two digits).
        </div>
      )}
    </div>
  );
}

function AirSurveillanceHelp() {
  const kbd = "rounded bg-[var(--color-field)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px]";
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold">Air Surveillance — quick help</div>
      <div className="text-[var(--color-muted-foreground)]">
        Log targets as they&apos;re read over the air-surveillance radio broadcast. The widget assesses threat against your own position.
      </div>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Getting started
      </div>
      <div className="text-[var(--color-muted-foreground)]">
        Set your grid (e.g. <code className="font-mono">MH 45</code>) in the widget settings. Threat assessment doesn&apos;t work without it.
      </div>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Fields
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr><td className="py-0.5 pr-3 font-semibold">ID</td><td>Four-digit target ID, e.g. 3456</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">LOCATION</td><td>100 km square + 10 km offsets, e.g. <code className="font-mono">MH 45</code></td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">HEADING</td><td>Degrees (e.g. 350) or compass: <code className="font-mono">N NE E SE S SW W NW</code></td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">SPEED</td><td>km/h, 50-unit step</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">ALTITUDE</td><td>SURFACE / LOW / HIGH</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">COUNT</td><td>Number of targets</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">TYPE</td><td>Aircraft type (autocomplete, drone variants normalized)</td></tr>
        </tbody>
      </table>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Keyboard shortcuts
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>Tab</kbd></td><td>Next field (ALTITUDE: one tab stop)</td></tr>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>↑</kbd> / <kbd className={kbd}>↓</kbd></td><td>Cycle ALTITUDE option</td></tr>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>Enter</kbd></td><td>Submit form (works from any text field)</td></tr>
        </tbody>
      </table>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Threat assessment
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr><td className="py-0.5 pr-3"><span className="rounded bg-[var(--color-field)] px-1 py-0.5 text-[9px] font-semibold uppercase text-[var(--color-muted-foreground)]">stable</span></td><td>Not approaching your square</td></tr>
          <tr><td className="py-0.5 pr-3"><span className="rounded bg-orange-500 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">approaching</span></td><td>Heading points at your location (±30°)</td></tr>
          <tr><td className="py-0.5 pr-3"><span className="rounded bg-red-600 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">in square</span></td><td>Track in your 10 km square — AIR ALARM button appears</td></tr>
        </tbody>
      </table>

      <div className="mt-1 text-[var(--color-muted-foreground)]">
        AIR ALARM appears as a banner for all users. Clear it via the <span className="font-semibold">ALL CLEAR</span> button in the action bar.
      </div>
    </div>
  );
}

export const airSurveillanceDescriptor: WidgetDescriptor = {
  type: "air-surveillance",
  name: "Air Surveillance",
  description: "Capture air-surveillance broadcasts, assess threats, sound AIR ALARM",
  icon: <MdRadar className="text-lg" />,
  defaultSize: { w: 12, h: 10, minW: 6, minH: 6 },
  defaultConfig: { operatorGrid: "", operatorZone: DEFAULT_FINNISH_ZONE, ttlMinutes: DEFAULT_TRACK_TTL_MS / 60_000 },
  component: AirSurveillanceWidget,
  configPanel: AirSurveillanceConfigPanel,
  needsScroll: false,
  help: <AirSurveillanceHelp />,
};
