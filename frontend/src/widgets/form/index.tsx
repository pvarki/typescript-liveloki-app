import { Button, FormGroup, HTMLSelect, InputGroup, TextArea } from "@blueprintjs/core";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";

import { createEmptyBattlelogEvent, submitBattlelogEvents } from "../../battlelog/event-data";
import { getKeywordStatistics } from "../../helpers/api";
import type { ConfigPanelProps, EventPayload, WidgetDescriptor, WidgetProps } from "../../types";

function MinimalForm() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    setTitle("");
    setNotes("");
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <FormGroup label="Title" labelInfo="(required)">
        <InputGroup value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter title..." />
      </FormGroup>
      <FormGroup label="Notes" className="flex-1">
        <TextArea className="resize-none" fill value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Enter notes..." />
      </FormGroup>
      <Button intent="primary" text="Submit" onClick={handleSubmit} disabled={!title.trim()} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-muted-foreground)]">
      {label}
      {children}
    </label>
  );
}

function BattlelogForm() {
  const [draft, setDraft] = useState<EventPayload>(() => createEmptyBattlelogEvent());
  const [isSubmitting, setSubmitting] = useState(false);
  const keywords = useSWR("keywords", getKeywordStatistics, { revalidateOnFocus: false });
  const keywordHint = useMemo(() => (keywords.data ?? []).slice(0, 8).map(({ keyword }) => keyword).join(", "), [keywords.data]);

  const update = (patch: Partial<EventPayload>) => setDraft((current) => ({ ...current, ...patch }));
  const setCsv = (key: "keywords" | "hcoe_domains", value: string) => {
    update({ [key]: value.split(",").map((item) => item.trim()).filter(Boolean) });
  };

  const submit = async () => {
    if (!draft.header.trim()) {
      toast.error("Header is required");
      return;
    }

    setSubmitting(true);
    try {
      await submitBattlelogEvents([draft]);
      setDraft(createEmptyBattlelogEvent());
      toast.success("Battlelog event submitted");
    } catch (error) {
      toast.error(String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-3 text-sm">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Field label="Header *"><InputGroup value={draft.header} onChange={(event) => update({ header: event.target.value })} placeholder="Required event header" /></Field>
        <Field label="Source"><InputGroup value={draft.source} onChange={(event) => update({ source: event.target.value })} /></Field>
        <Field label="Link"><InputGroup value={draft.link} onChange={(event) => update({ link: event.target.value })} /></Field>
        <Field label="Author"><InputGroup value={draft.author} onChange={(event) => update({ author: event.target.value })} /></Field>
        <Field label="Reliability"><InputGroup value={draft.admiralty_reliability} onChange={(event) => update({ admiralty_reliability: event.target.value })} placeholder="A-F" /></Field>
        <Field label="Accuracy"><InputGroup value={draft.admiralty_accuracy} onChange={(event) => update({ admiralty_accuracy: event.target.value })} placeholder="1-6" /></Field>
        <Field label="Event time"><InputGroup type="datetime-local" value={draft.event_time} onChange={(event) => update({ event_time: event.target.value })} /></Field>
        <Field label="Location"><InputGroup value={draft.location} onChange={(event) => update({ location: event.target.value })} /></Field>
        <Field label="Latitude"><InputGroup type="number" value={String(draft.location_lat ?? "")} onChange={(event) => update({ location_lat: event.target.value ? Number(event.target.value) : undefined })} /></Field>
        <Field label="Longitude"><InputGroup type="number" value={String(draft.location_lng ?? "")} onChange={(event) => update({ location_lng: event.target.value ? Number(event.target.value) : undefined })} /></Field>
      </div>
      <Field label="Keywords"><InputGroup value={draft.keywords.join(", ")} onChange={(event) => setCsv("keywords", event.target.value)} placeholder={keywordHint || "comma-separated keywords"} /></Field>
      <Field label="HCOE domains"><InputGroup value={draft.hcoe_domains.join(", ")} onChange={(event) => setCsv("hcoe_domains", event.target.value)} placeholder="comma-separated domains" /></Field>
      <Field label="Notes"><TextArea fill value={draft.notes ?? ""} onChange={(event) => update({ notes: event.target.value })} /></Field>
      <Button intent="primary" loading={isSubmitting} disabled={!draft.header.trim()} onClick={submit}>Submit Battlelog event</Button>
    </div>
  );
}

function FormWidget({ config }: WidgetProps) {
  return config.mode === "minimal" ? <MinimalForm /> : <BattlelogForm />;
}

function FormConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <FormGroup label="Form mode">
      <HTMLSelect
        fill
        value={(config.mode as string | undefined) ?? "battlelog"}
        onChange={(event) => onChange({ ...config, mode: event.currentTarget.value })}
        options={[
          { label: "Battlelog event submission", value: "battlelog" },
          { label: "Minimal title/notes", value: "minimal" },
        ]}
      />
    </FormGroup>
  );
}

export const formDescriptor: WidgetDescriptor = {
  type: "form",
  name: "Form",
  description: "Minimal form or Battlelog event submission",
  icon: <span className="text-lg">&#x1F4CB;</span>,
  defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
  defaultConfig: { mode: "battlelog" },
  component: FormWidget,
  configPanel: FormConfigPanel,
  needsScroll: false,
};
