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

const ALT_OPTIONS: Array<{ code: AltitudeCode; label: string; range: string }> = [
  { code: "pinnassa", label: "PINNASSA", range: "< 300 m" },
  { code: "matalalla", label: "MATALALLA", range: "300–3000 m" },
  { code: "korkealla", label: "KORKEALLA", range: "> 3000 m" },
];

const COMPASS_DIRS: Record<string, number> = {
  P: 0,    // pohjoinen
  KO: 45,  // koillinen
  I: 90,   // itä
  KA: 135, // kaakko
  E: 180,  // etelä
  LO: 225, // lounas
  L: 270,  // länsi
  LU: 315, // luode
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
  "rynnäkkökone",
  "hävittäjä",
  "pommikone",
  "tiedustelukone",
  "kuljetuskone",
  "helikopteri",
  "taisteluhelikopteri",
  "kuljetushelikopteri",
  "tiedusteluhelikopteri",
  "lennokki",
  "drooni",
  "ohjus",
] as const;

const TYPE_ALIASES: Record<string, string> = {
  drooni: "lennokki",
  droonit: "lennokki",
  drooneja: "lennokki",
  drone: "lennokki",
  drones: "lennokki",
  helikopterit: "helikopteri",
  helikoptereita: "helikopteri",
  rynnäkkökoneita: "rynnäkkökone",
  hävittäjiä: "hävittäjä",
  pommikoneita: "pommikone",
  tiedustelukoneita: "tiedustelukone",
  kuljetuskoneita: "kuljetuskone",
  taisteluhelikoptereita: "taisteluhelikopteri",
  kuljetushelikoptereita: "kuljetushelikopteri",
  tiedusteluhelikoptereita: "tiedusteluhelikopteri",
  lennokkeja: "lennokki",
  ohjuksia: "ohjus",
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
      return { label: "OMASSA RUUDUSSA", className: "bg-red-600 text-white" };
    }
    case "heading_toward": {
      return { label: "LÄHESTYY", className: "bg-orange-500 text-white" };
    }
    default: {
      return { label: "vakaa", className: "bg-[var(--color-field)] text-[var(--color-muted-foreground)]" };
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

  function handleSubmit(altitudeOverride?: AltitudeCode) {
    const altitude = altitudeOverride ?? draft.altitude;
    const parsedGrid = parseGridString(gridRaw);
    if (!parsedGrid) {
      setError("Sijainti odottaa muotoa 'MH 45'");
      return;
    }
    if (!draft.trackId.trim()) {
      setError("Tunnus puuttuu");
      return;
    }
    const heading = parseHeading(headingRaw);
    if (heading === null) {
      setError("Suunta odottaa joko asteita (0–350) tai ilmansuuntaa (N, NE, E, …)");
      return;
    }
    const point = gridToLatLng(parsedGrid.letters, parsedGrid.e10, parsedGrid.n10, operatorZone);
    if (!point) {
      setError(`Ruudukko ${formatGridString(parsedGrid)} ei ratkea vyöhykkeessä ${operatorZone}`);
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
      altitude,
      count: draft.count,
      type: canonicalizeType(draft.type) || "tuntematon",
      lat: point.lat,
      lng: point.lng,
      capturedAt: Date.now(),
    };
    setError(null);
    void onSubmit(track);
    setDraft({ ...emptyBroadcast(), heading, speed: draft.speed, altitude });
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
        <FormGroup label="TUNNUS" className="!mb-0">
          <InputGroup
            autoFocus
            placeholder="3456"
            value={draft.trackId}
            onChange={(e) => setDraft({ ...draft, trackId: e.target.value })}
          />
        </FormGroup>
        <FormGroup label="SIJAINTI" className="!mb-0">
          <InputGroup
            placeholder="MH 45"
            value={gridRaw}
            onChange={(e) => setGridRaw(e.target.value)}
          />
        </FormGroup>
      </div>

      <FormGroup label="SUUNTA" className="!mb-0" helperText="Asteet (esim. 350) tai ilmansuunta: P, KO, I, KA, E, LO, L, LU">
        <InputGroup
          list="air-track-headings"
          placeholder="350 tai P / KO / I / KA / E / LO / L / LU"
          value={headingRaw}
          onChange={(e) => setHeadingRaw(e.target.value)}
        />
        <datalist id="air-track-headings">
          <option value="P">pohjoinen</option>
          <option value="KO">koillinen</option>
          <option value="I">itä</option>
          <option value="KA">kaakko</option>
          <option value="E">etelä</option>
          <option value="LO">lounas</option>
          <option value="L">länsi</option>
          <option value="LU">luode</option>
        </datalist>
      </FormGroup>

      <FormGroup label="NOPEUS km/h" className="!mb-0">
        <InputGroup
          type="number"
          step={50}
          min={0}
          value={String(draft.speed)}
          onChange={(e) => setDraft({ ...draft, speed: Math.max(0, Number(e.target.value) || 0) })}
        />
      </FormGroup>

      <FormGroup label="KORKEUS" className="!mb-0" helperText="Tab selaa, välilyönti valitsee, Enter valitsee ja lähettää">
        <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Korkeus">
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
                    handleSubmit(opt.code);
                  }
                }}
                aria-label={`Korkeus ${opt.label}`}
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

      <FormGroup label="LUKUMÄÄRÄ" className="!mb-0">
        <InputGroup
          type="number"
          min={1}
          value={String(draft.count)}
          onChange={(e) => setDraft({ ...draft, count: Math.max(1, Number(e.target.value) || 1) })}
        />
      </FormGroup>

      <FormGroup label="LAATU" className="!mb-0" helperText="Drooni → lennokki">
        <InputGroup
          list="air-track-types"
          placeholder="rynnäkkökone"
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
      <Button intent="primary" icon="add" text="Tallenna maali" type="submit" />
    </form>
  );
}

function TrackRow({ track, user, onRemove }: { track: AirTrack; user: OperatorLocation | null; onRemove: () => void }) {
  const tier = assessThreat(track, user);
  const badge = describeThreat(tier);
  return (
    <div className="border-b border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-field)]">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-baseline gap-2 truncate">
          <span className="font-mono text-sm font-semibold">{track.trackId}</span>
          <span className="font-mono text-[var(--color-muted-foreground)]">{track.gridLetters} {track.gridE10}{track.gridN10}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${badge.className}`}>{badge.label}</span>
          <Button minimal small icon="cross" onClick={onRemove} aria-label="Remove track" />
        </div>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px] text-[var(--color-muted-foreground)]">
        <span>SUUNTA {track.heading}°</span>
        <span>{track.speed} km/h</span>
        <span>{describeAltitude(track.altitude)}</span>
        <span>{track.count}× <span className="text-[var(--color-foreground)]">{track.type}</span></span>
      </div>
    </div>
  );
}

function AirSurveillanceWidget({ config }: WidgetProps) {
  const cfg = config as AirSurveillanceConfig;
  const operator = useMemo(() => getOperatorLocation(cfg), [cfg]);
  const tracks = useAirSurveillanceStore((s) => s.tracks);
  const addOrReplaceTrack = useAirSurveillanceStore((s) => s.addOrReplaceTrack);
  const removeTrack = useAirSurveillanceStore((s) => s.removeTrack);
  const pruneExpired = useAirSurveillanceStore((s) => s.pruneExpired);
  const { data: events } = useBattlelogEvents();
  const activeAlarm = useMemo(() => deriveActiveAlarm(events), [events]);
  const ttlMs = (cfg.ttlMinutes ?? DEFAULT_TRACK_TTL_MS / 60_000) * 60_000;

  useEffect(() => {
    pruneExpired(ttlMs);
    const interval = setInterval(() => pruneExpired(ttlMs), 30_000);
    return () => clearInterval(interval);
  }, [pruneExpired, ttlMs]);

  const tier3Track = useMemo(
    () => operator && tracks.find((t) => assessThreat(t, operator) === "inside_square"),
    [operator, tracks],
  );

  async function handleSubmitTrack(track: AirTrack) {
    addOrReplaceTrack(track);
    const payload = {
      ...createEmptyBattlelogEvent(),
      header: `Ilmavalvonta ${track.trackId}: ${track.gridLetters} ${track.gridE10}${track.gridN10} — ${track.count}× ${track.type}, ${track.heading}°/${track.speed} km/h, ${describeAltitude(track.altitude).toLowerCase()}`,
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
      toast.success(`Maali ${track.trackId} kirjattu`);
    } catch (error) {
      console.error("Failed to log air track", error);
      toast.error("Maali tallennettu paikallisesti — palvelimelle kirjaus epäonnistui");
    }
  }

  async function declareAlarm(state: "ilmahalytys" | "vaara_ohi", triggeringTrack?: AirTrack) {
    if (!operator) {
      toast.error("Aseta oma sijainti widgetin asetuksista");
      return;
    }
    const payload = {
      ...createEmptyBattlelogEvent(),
      header: state === "ilmahalytys" ? "ILMAHÄLYTYS" : "VAARA OHI",
      source: "air-surveillance-widget",
      keywords: ["alarm", `alarm:${state}`],
      event_time: new Date().toISOString(),
      location: `${operator.gridLetters} ${operator.gridE10}${operator.gridN10}`,
      location_lat: operator.lat,
      location_lng: operator.lng,
      author: "air-surveillance",
      notes: triggeringTrack ? `Trigger: maali ${triggeringTrack.trackId} (${triggeringTrack.type})` : undefined,
    };
    try {
      await submitBattlelogEvents([payload]);
      toast.success(state === "ilmahalytys" ? "ILMAHÄLYTYS annettu" : "VAARA OHI");
    } catch (error) {
      console.error("Failed to declare alarm", error);
      toast.error("Hälytyksen kirjaus epäonnistui");
    }
  }

  const sortedTracks = tracks.toSorted((a, b) => b.capturedAt - a.capturedAt);

  return (
    <div className="flex h-full flex-col">
      {!operator && (
        <div className="m-2 rounded border border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2 py-1 text-xs text-[var(--color-warning)]">
          Aseta oma ruudukko widgetin asetuksista (esim. <code className="font-mono">MH 45</code>) jotta uhka-arvio toimii.
        </div>
      )}
      {activeAlarm && (
        <div className={`m-2 rounded px-2 py-1 text-xs font-semibold uppercase ${activeAlarm.state === "ilmahalytys" ? "bg-red-700 text-white" : "bg-orange-600 text-white"}`}>
          {activeAlarm.state === "ilmahalytys" ? "ILMAHÄLYTYS voimassa" : "ILMAVAROITUS voimassa"}
        </div>
      )}
      {tier3Track && !activeAlarm && (
        <button
          type="button"
          onClick={() => declareAlarm("ilmahalytys", tier3Track)}
          className="m-2 rounded bg-red-600 px-3 py-3 text-center text-sm font-bold uppercase text-white shadow hover:bg-red-700"
        >
          Maali {tier3Track.trackId} omassa ruudussa — Anna ILMAHÄLYTYS
        </button>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 w-1/2 shrink-0 overflow-y-auto border-r border-[var(--color-border)]">
          <BroadcastForm onSubmit={handleSubmitTrack} operatorZone={cfg.operatorZone || DEFAULT_FINNISH_ZONE} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {sortedTracks.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-[var(--color-muted-foreground)]">
              Ei aktiivisia maaleja
            </div>
          ) : (
            sortedTracks.map((track) => (
              <TrackRow key={track.id} track={track} user={operator} onRemove={() => removeTrack(track.id)} />
            ))
          )}
        </div>
      </div>
      <WidgetActionBar
        primary={
          activeAlarm ? (
            <Button intent="warning" text="VAARA OHI" fill small onClick={() => declareAlarm("vaara_ohi")} />
          ) : (
            <Button minimal text={`${sortedTracks.length} maalia`} fill small disabled />
          )
        }
        secondary={
          operator ? (
            <Button minimal small icon="map-marker" text={`Oma: ${operator.gridLetters} ${operator.gridE10}${operator.gridN10}`} disabled />
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
      <FormGroup label="Oma ruudukko (esim. MH 45)" helperText="Käytetään uhka-arvioon ja ILMAHÄLYTYS-tapahtuman sijaintiin.">
        <InputGroup value={gridDraft} onChange={(e) => setGridDraft(e.target.value)} onBlur={commit} placeholder="MH 45" />
      </FormGroup>
      <FormGroup label="UTM-vyöhyke" helperText="Suomessa yleensä 35V; läntinen Suomi 34V.">
        <InputGroup value={zoneDraft} onChange={(e) => setZoneDraft(e.target.value)} onBlur={commit} />
      </FormGroup>
      <FormGroup label="Maalin vanheneminen (min)" helperText="Maali poistuu listalta tämän ajan kuluttua viime havainnosta.">
        <InputGroup type="number" min={1} value={String(ttlDraft)} onChange={(e) => setTtlDraft(Number(e.target.value) || 15)} onBlur={commit} />
      </FormGroup>
      {parsed && preview && (
        <div className="rounded border border-[var(--color-border)] p-2 text-xs text-[var(--color-muted-foreground)]">
          {formatGridString(parsed)} → {preview.lat.toFixed(4)}°N, {preview.lng.toFixed(4)}°E
        </div>
      )}
      {gridDraft.trim() && !parsed && (
        <div className="rounded border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-2 text-xs text-[var(--color-danger)]">
          Ruudukon muoto pitäisi olla &quot;MH 45&quot; (kaksi kirjainta + kaksi numeroa).
        </div>
      )}
    </div>
  );
}

function AirSurveillanceHelp() {
  const kbd = "rounded bg-[var(--color-field)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px]";
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold">Air Surveillance — pikaohje</div>
      <div className="text-[var(--color-muted-foreground)]">
        Kirjaa ilmavalvontaselosteen maaleja sitä mukaa kun ne luetaan ULA-radiossa. Widget arvioi uhkaa oman sijaintisi suhteen.
      </div>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Aloitus
      </div>
      <div className="text-[var(--color-muted-foreground)]">
        Aseta oma ruudukko (esim. <code className="font-mono">MH 45</code>) widgetin asetuksista. Ilman sitä uhka-arvio ei toimi.
      </div>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Kenttien syöttö
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr><td className="py-0.5 pr-3 font-semibold">TUNNUS</td><td>Maalin nelinumeroinen tunnus, esim. 3456</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">SIJAINTI</td><td>100 km ruutu + 10 km koordinaatit, esim. <code className="font-mono">MH 45</code></td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">SUUNTA</td><td>Asteet (esim. 350) tai ilmansuunta: <code className="font-mono">P KO I KA E LO L LU</code></td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">NOPEUS</td><td>km/h, 50 yksikön tarkkuus</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">KORKEUS</td><td>PINNASSA / MATALALLA / KORKEALLA</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">LUKUMÄÄRÄ</td><td>Maalien määrä</td></tr>
          <tr><td className="py-0.5 pr-3 font-semibold">LAATU</td><td>Konetyyppi (autotäydennys, drooni → lennokki)</td></tr>
        </tbody>
      </table>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Pikanäppäimet
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>Tab</kbd></td><td>Seuraavaan kenttään (KORKEUS: yksi tab-pysähdys)</td></tr>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>↑</kbd> / <kbd className={kbd}>↓</kbd></td><td>Vaihda KORKEUS-vaihtoehtoa</td></tr>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>Enter</kbd></td><td>Lähetä lomake (toimii kaikista tekstikentistä)</td></tr>
        </tbody>
      </table>

      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Uhka-arvio
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr><td className="py-0.5 pr-3"><span className="rounded bg-[var(--color-field)] px-1 py-0.5 text-[9px] font-semibold uppercase text-[var(--color-muted-foreground)]">vakaa</span></td><td>Ei lähesty omaa ruutua</td></tr>
          <tr><td className="py-0.5 pr-3"><span className="rounded bg-orange-500 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">lähestyy</span></td><td>Suunta osoittaa omaan sijaintiin (±30°)</td></tr>
          <tr><td className="py-0.5 pr-3"><span className="rounded bg-red-600 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">omassa</span></td><td>Maali on omassa 10 km ruudussa — ilmestyy ILMAHÄLYTYS-painike</td></tr>
        </tbody>
      </table>

      <div className="mt-1 text-[var(--color-muted-foreground)]">
        ILMAHÄLYTYS näkyy banner-palkkina kaikille käyttäjille. Tyhjennä <span className="font-semibold">VAARA OHI</span> -painikkeesta toimintarivillä.
      </div>
    </div>
  );
}

export const airSurveillanceDescriptor: WidgetDescriptor = {
  type: "air-surveillance",
  name: "Air Surveillance",
  description: "Kirjaa ilmavalvontaselosteen maaleja, arvioi uhkaa ja anna ILMAHÄLYTYS",
  icon: <MdRadar className="text-lg" />,
  defaultSize: { w: 12, h: 10, minW: 6, minH: 6 },
  defaultConfig: { operatorGrid: "", operatorZone: DEFAULT_FINNISH_ZONE, ttlMinutes: DEFAULT_TRACK_TTL_MS / 60_000 },
  component: AirSurveillanceWidget,
  configPanel: AirSurveillanceConfigPanel,
  needsScroll: false,
  help: <AirSurveillanceHelp />,
};
