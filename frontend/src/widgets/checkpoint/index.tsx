import { Button, FormGroup, InputGroup } from "@blueprintjs/core";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MdSecurity } from "react-icons/md";

import { createEmptyBattlelogEvent, submitBattlelogEvents, useBattlelogEvents } from "../../battlelog/event-data";
import type { ConfigPanelProps, EventPayload, WidgetDescriptor, WidgetProps } from "../../types";
import { WidgetActionBar } from "../WidgetActionBar";
import { deriveInsideRoster, findInsidePersonsByBase, nextNamesakeSlug, parseSlug, slugifyName } from "./roster";
import type { CheckpointPerson, PersonState } from "./types";

interface CheckpointConfig {
  location?: string;
}

function buildTransitionEvent(displayName: string, state: PersonState, location: string, slug: string): EventPayload {
  return {
    ...createEmptyBattlelogEvent(),
    header: state === "in" ? `Checkpoint IN: ${displayName}` : `Checkpoint OUT: ${displayName}`,
    source: "checkpoint-widget",
    keywords: ["checkpoint", `state:${state}`, `person:${slug}`],
    event_time: new Date().toISOString(),
    location,
    author: "checkpoint",
  };
}

async function submitTransition(payload: EventPayload, successMessage: string) {
  try {
    await submitBattlelogEvents([payload]);
    toast.success(successMessage);
  } catch (error) {
    console.error("Checkpoint log failed", error);
    toast.error("Failed to log");
  }
}

function formatSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function RosterRow({ person, onCheckOut }: { person: CheckpointPerson; onCheckOut: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-field)]">
      <div className="flex items-baseline gap-2 truncate">
        <span className="truncate font-medium">{person.displayName}</span>
        <span className="font-mono text-[10px] text-[var(--color-muted-foreground)]">{formatSince(person.since)}</span>
      </div>
      <Button minimal small icon="log-out" text="Log out" onClick={onCheckOut} />
    </div>
  );
}

function CheckpointWidget({ config }: WidgetProps) {
  const cfg = config as CheckpointConfig;
  const location = cfg.location?.trim() || "";
  const { data: events } = useBattlelogEvents();
  const roster = useMemo(() => deriveInsideRoster(events), [events]);
  const [draft, setDraft] = useState("");
  const [pendingCollision, setPendingCollision] = useState<{ name: string; candidates: CheckpointPerson[] } | null>(null);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [pendingDiscriminator, setPendingDiscriminator] = useState<string | null>(null);
  const [discriminatorDraft, setDiscriminatorDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const discriminatorRef = useRef<HTMLInputElement | null>(null);

  function resetForm() {
    setDraft("");
    setPendingCollision(null);
    setPendingIndex(0);
    setPendingDiscriminator(null);
    setDiscriminatorDraft("");
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (pendingDiscriminator !== null) discriminatorRef.current?.focus();
  }, [pendingDiscriminator]);

  function enterDiscriminatorMode(baseName: string) {
    setPendingCollision(null);
    setPendingDiscriminator(baseName);
    setDiscriminatorDraft("");
  }

  async function confirmDiscriminator() {
    if (pendingDiscriminator === null) return;
    const baseName = pendingDiscriminator;
    const disc = discriminatorDraft.trim();
    resetForm();
    if (!disc) {
      await addNamesake(baseName);
      return;
    }
    const fullName = `${baseName} ${disc}`;
    const slug = slugifyName(fullName);
    const target = roster.find((p) => p.slug === slug);
    await (target ? logOut(target) : logIn(fullName, slug));
  }

  async function logIn(displayName: string, slug: string) {
    await submitTransition(buildTransitionEvent(displayName, "in", location, slug), `${displayName} checked in`);
  }

  async function logOut(person: CheckpointPerson) {
    await submitTransition(buildTransitionEvent(person.displayName, "out", location, person.slug), `${person.displayName} checked out`);
  }

  async function addNamesake(baseName: string) {
    const baseSlug = slugifyName(baseName);
    const nextSlug = nextNamesakeSlug(events, baseSlug);
    const parsed = parseSlug(nextSlug);
    const displayName = parsed.num === null ? baseName : `${baseName} #${parsed.num}`;
    await logIn(displayName, nextSlug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pendingDiscriminator !== null) {
      await confirmDiscriminator();
      return;
    }
    if (pendingCollision) {
      const N = pendingCollision.candidates.length;
      const name = pendingCollision.name;
      const idx = pendingIndex;
      if (idx < N) {
        const target = pendingCollision.candidates[idx];
        resetForm();
        await logOut(target);
      } else if (idx === N) {
        enterDiscriminatorMode(name);
      } else {
        resetForm();
      }
      return;
    }
    const name = draft.trim();
    if (!name) return;
    const typedSlug = slugifyName(name);
    const parsed = parseSlug(typedSlug);
    if (parsed.num !== null) {
      const target = roster.find((p) => p.slug === typedSlug);
      resetForm();
      await (target ? logOut(target) : logIn(name, typedSlug));
      return;
    }
    const matching = findInsidePersonsByBase(events, typedSlug);
    if (matching.length === 0) {
      resetForm();
      await logIn(name, typedSlug);
      return;
    }
    setPendingCollision({ name, candidates: matching });
    setPendingIndex(0);
  }

  async function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!pendingCollision) return;
    const total = pendingCollision.candidates.length + 2;
    if (e.key === "Escape") {
      e.preventDefault();
      resetForm();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPendingIndex((i) => Math.min(i + 1, total - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setPendingIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= pendingCollision.candidates.length) {
      e.preventDefault();
      const candidate = pendingCollision.candidates[Number(e.key) - 1];
      resetForm();
      await logOut(candidate);
    }
  }

  function handleInputChange(value: string) {
    setDraft(value);
    if (pendingCollision) setPendingCollision(null);
  }

  async function handleCheckOutAll() {
    if (roster.length === 0) return;
    if (!globalThis.confirm(`Log out all ${roster.length} people?`)) return;
    const payloads = roster.map((p) => buildTransitionEvent(p.displayName, "out", location, p.slug));
    try {
      await submitBattlelogEvents(payloads);
      toast.success(`${payloads.length} checked out`);
    } catch (error) {
      console.error("Bulk checkout failed", error);
      toast.error("Bulk checkout failed");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 overflow-y-auto border-b border-[var(--color-border)]">
          <form className="flex flex-col gap-2 p-2" onSubmit={handleSubmit}>
            <FormGroup label="NAME" className="!mb-0">
              <InputGroup
                inputRef={(el) => { inputRef.current = el; }}
                autoFocus
                placeholder="Matti"
                value={draft}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
            </FormGroup>
            <Button intent="primary" icon="log-in" text="Log" type="submit" className="!mt-2" />
            {pendingDiscriminator !== null && (
              <div className="rounded border border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-2 text-xs">
                <div className="mb-2 font-semibold">
                  Add new: {pendingDiscriminator} <span className="font-normal text-[var(--color-muted-foreground)]">+ last name or tag</span>
                </div>
                <InputGroup
                  inputRef={(el) => { discriminatorRef.current = el; }}
                  placeholder="e.g. V or Smith"
                  value={discriminatorDraft}
                  onChange={(e) => setDiscriminatorDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { e.preventDefault(); resetForm(); }
                  }}
                />
                <div className="mt-1 text-right text-[10px] text-[var(--color-muted-foreground)]">
                  {discriminatorDraft.trim()
                    ? `Will save: ${pendingDiscriminator} ${discriminatorDraft.trim()}`
                    : `Empty → auto #N`}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <Button
                    type="button"
                    intent="primary"
                    small
                    fill
                    alignText="left"
                    text={
                      <span className="flex w-full items-center gap-2">
                        <span className="flex-1 text-left">Add</span>
                        <span className="font-mono text-[10px] opacity-70">↵</span>
                      </span>
                    }
                    onClick={() => { void confirmDiscriminator(); }}
                  />
                  <Button
                    type="button"
                    minimal
                    small
                    fill
                    alignText="left"
                    text={
                      <span className="flex w-full items-center gap-2">
                        <span className="flex-1 text-left">Cancel</span>
                        <span className="font-mono text-[10px] opacity-70">Esc</span>
                      </span>
                    }
                    onClick={() => resetForm()}
                  />
                </div>
              </div>
            )}
            {pendingCollision && (() => {
              const N = pendingCollision.candidates.length;
              const addIdx = N;
              const cancelIdx = N + 1;
              const optionRow = (i: number, label: React.ReactNode, onClick: () => void, hint?: string) => (
                <Button
                  key={i}
                  type="button"
                  intent={i === pendingIndex ? "primary" : "none"}
                  active={i === pendingIndex}
                  small
                  fill
                  alignText="left"
                  text={
                    <span className="flex w-full items-center gap-2">
                      <span className="flex-1 text-left">{label}</span>
                      <span className="font-mono text-[10px] opacity-70">
                        {i === pendingIndex ? "↵" : (hint ?? "")}
                      </span>
                    </span>
                  }
                  onClick={onClick}
                />
              );
              return (
                <div className="rounded border border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-2 text-xs">
                  <div className="mb-2 font-semibold">
                    {N === 1
                      ? `${pendingCollision.candidates[0].displayName} is already inside`
                      : `${N} people named ${pendingCollision.name} inside`}
                  </div>
                  <div className="flex flex-col gap-1">
                    {pendingCollision.candidates.map((c, i) =>
                      optionRow(
                        i,
                        <>Log out: {c.displayName} — {formatSince(c.since)}</>,
                        () => { void (async () => { resetForm(); await logOut(c); })(); },
                        N > 1 ? `${i + 1}` : undefined,
                      ),
                    )}
                    {optionRow(
                      addIdx,
                      `Add new ${pendingCollision.name}`,
                      () => enterDiscriminatorMode(pendingCollision.name),
                    )}
                    {optionRow(
                      cancelIdx,
                      "Cancel",
                      () => resetForm(),
                      "Esc",
                    )}
                  </div>
                </div>
              );
            })()}
          </form>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-field)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            <span>Currently inside</span>
            {location && <span className="font-mono normal-case text-[10px]">{location}</span>}
          </div>
          {roster.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-[var(--color-muted-foreground)]">
              Nobody inside
            </div>
          ) : (
            roster.map((person) => (
              <RosterRow key={person.slug} person={person} onCheckOut={() => { void logOut(person); }} />
            ))
          )}
        </div>
      </div>
      <WidgetActionBar
        primary={
          <Button
            intent="warning"
            text="Log out all"
            icon="log-out"
            fill
            small
            disabled={roster.length === 0}
            onClick={handleCheckOutAll}
          />
        }
        secondary={<Button minimal small text={`${roster.length} inside`} disabled />}
      />
    </div>
  );
}

function CheckpointConfigPanel({ config, onChange }: ConfigPanelProps) {
  const cfg = config as CheckpointConfig;
  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Location">
        <InputGroup
          value={cfg.location ?? ""}
          onChange={(e) => onChange({ ...config, location: e.target.value })}
          placeholder="Gate 1"
        />
      </FormGroup>
    </div>
  );
}

function CheckpointHelp() {
  const kbd = "rounded bg-[var(--color-field)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px]";
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold">Checkpoint — quick help</div>
      <div className="text-[var(--color-muted-foreground)]">
        Type a name and press Enter. Anyone already inside with the same name is shown as a picker.
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Keyboard shortcuts
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>Enter</kbd></td><td>Log in or out (smart toggle)</td></tr>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>↑</kbd> / <kbd className={kbd}>↓</kbd></td><td>Navigate same-name candidates</td></tr>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>1</kbd>–<kbd className={kbd}>9</kbd></td><td>Pick a candidate by number</td></tr>
          <tr><td className="py-0.5 pr-3"><kbd className={kbd}>Esc</kbd></td><td>Cancel selection</td></tr>
        </tbody>
      </table>
      <div className="mt-1 text-[var(--color-muted-foreground)]">
        Tip: if several people named Matti are inside, type e.g. <code className="font-mono">Matti #2</code> to log that specific person out.
      </div>
    </div>
  );
}

export const checkpointDescriptor: WidgetDescriptor = {
  type: "checkpoint",
  name: "Checkpoint",
  description: "Log personnel passing through a checkpoint",
  icon: <MdSecurity className="text-lg" />,
  defaultSize: { w: 6, h: 9, minW: 4, minH: 5 },
  defaultConfig: { location: "" },
  component: CheckpointWidget,
  configPanel: CheckpointConfigPanel,
  needsScroll: false,
  help: <CheckpointHelp />,
};
