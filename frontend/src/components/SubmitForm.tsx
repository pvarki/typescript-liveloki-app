import React from "react";
import useSWR, { mutate } from "swr";
import { create } from "mutative";
import { EventPayload } from "../types.ts";
import { getKeywordStatistics, postEvents } from "../helpers/api.ts";

import CreatableSelect from "react-select/creatable";
import hcoeDomains from "../data/hcoe-domains.ts";
import * as reactSelect from "../helpers/react-select.ts";
import toast from "react-hot-toast";
import { MapPickerWidget } from "./MapPickerWidget.tsx";
import { makeCreateElementOnCommaHandler } from "../helpers/react-select.ts";

const hcoeDomainOptions = hcoeDomains.map((domain) => ({ value: domain, label: domain }));

function SingleEventFields({
  state,
  updateState,
  canDelete,
  onDelete,
  keywordOptions,
}: {
  state: EventPayload;
  updateState: (state: Partial<EventPayload>) => void;
  canDelete: boolean;
  onDelete: () => void;
  keywordOptions: ReadonlyArray<{ value: string; label: string; count: number }>;
}) {
  const [showLocation, setShowLocation] = React.useState(false);
  const update = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ [event.target.name]: event.target.value });
    },
    [state, updateState],
  );
  const onKeywordInputChange = makeCreateElementOnCommaHandler((value) =>
    updateState({ keywords: [...state.keywords, value] }),
  );
  const onDomainInputChange = makeCreateElementOnCommaHandler((value) =>
    updateState({ hcoe_domains: [...state.hcoe_domains, value] }),
  );
  const body = (
    <div className="gap-2 grid grid-cols-1 lg:grid-cols-4">
      <input
        type="text"
        name="header"
        placeholder="Header"
        required
        className="ll-input"
        onChange={update}
        value={state.header}
      />
      <input
        type="text"
        name="link"
        placeholder="Link"
        className="ll-input"
        onChange={update}
        value={state.link}
      />
      <input
        type="text"
        name="source"
        placeholder="Source"
        className="ll-input"
        onChange={update}
        value={state.source}
      />
      <input
        type="text"
        name="admiralty_reliability"
        placeholder="Reliability"
        className="ll-input"
        onChange={update}
        value={state.admiralty_reliability}
      />
      <input
        type="text"
        name="admiralty_accuracy"
        placeholder="Accuracy"
        className="ll-input"
        onChange={update}
        value={state.admiralty_accuracy}
      />
      <input
        type="datetime-local"
        name="event_time"
        placeholder="Event time"
        className="ll-input"
        onChange={update}
        value={state.event_time}
      />
      <CreatableSelect
        isMulti
        placeholder="Keywords"
        options={keywordOptions}
        noOptionsMessage={() => "Type to create a new keyword"}
        {...reactSelect.commonProps}
        value={state.keywords.map((keyword) => ({ value: keyword, label: keyword }))}
        onChange={(keywords) => updateState({ keywords: keywords.map((k) => k.value) })}
        onInputChange={onKeywordInputChange}
      />
      <CreatableSelect
        isMulti
        placeholder="HCOE Domains"
        options={hcoeDomainOptions}
        {...reactSelect.commonProps}
        value={state.hcoe_domains.map((domain) => ({ value: domain, label: domain }))}
        onChange={(domains) => updateState({ hcoe_domains: domains.map((domain) => domain.value) })}
        onInputChange={onDomainInputChange}
      />
    </div>
  );
  const locationBody = (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          name="location"
          placeholder="Location (free text)"
          className="ll-input"
          onChange={update}
          value={state.location}
        />
        <div className="flex gap-1">
          <input
            type="number"
            name="location_lat"
            min={-90}
            max={90}
            step={0.1}
            autoComplete="off"
            placeholder="Latitude"
            className="ll-input min-w-32"
            onChange={update}
            value={state.location_lat ?? ""}
          />
          <input
            type="number"
            name="location_lng"
            min={-180}
            max={180}
            step={0.1}
            autoComplete="off"
            placeholder="Longitude"
            className="ll-input min-w-32"
            onChange={update}
            value={state.location_lng ?? ""}
          />
        </div>
      </div>
      <MapPickerWidget
        selected={
          state.location_lng !== undefined && state.location_lat !== undefined
            ? {
                lat: parseFloat(state.location_lat.toFixed(4)),
                lng: parseFloat(state.location_lng.toFixed(4)),
              }
            : undefined
        }
        onPick={(location) => updateState({ location_lat: location.lat, location_lng: location.lng })}
      />
    </div>
  );
  return (
    <div className="flex gap-2">
      <div className="grow">
        {body}
        <details open={showLocation} onToggle={(event) => setShowLocation(event.currentTarget.open)}>
          <summary className="py-2 cursor-pointer">Location</summary>
          {showLocation ? locationBody : null}
        </details>
      </div>
      <button type="button" onClick={onDelete} className="ll-btn" disabled={!canDelete} hidden={!canDelete}>
        &times;
      </button>
    </div>
  );
}

function initFormState(): EventPayload {
  return {
    header: "",
    link: "",
    source: "",
    admiralty_reliability: "",
    admiralty_accuracy: "",
    event_time: "",
    keywords: [],
    hcoe_domains: [],
    location: "",
  };
}

export default function SubmitForm() {
  const keywordsSWR = useSWR("keywords", getKeywordStatistics, {
    revalidateOnFocus: false,
  });
  const [states, setStates] = React.useState<EventPayload[]>([initFormState()]);
  const updateState = (i: number, newState: Partial<EventPayload>) => {
    setStates((states) =>
      create(states, (draft) => {
        draft[i] = { ...draft[i], ...newState };
      }),
    );
  };
  const deleteState = (i: number) => {
    setStates((states) => states.filter((_, j) => j !== i));
  };
  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await postEvents(states);
    } catch (err) {
      toast.error(String(err));
      return;
    }
    setStates([initFormState()]);
    toast.success("Events submitted successfully");
    void mutate("events"); // Inform SWR cache that the events have changed
  };
  const keywordOptions = React.useMemo(
    () =>
      (keywordsSWR.data ?? []).map(({ keyword, count }) => ({
        count,
        label: keyword,
        value: keyword,
      })),
    [keywordsSWR.data],
  );
  return (
    <form className="mb-2" onSubmit={onSubmit}>
      <div className="mb-2 flex flex-col gap-2">
        {states.map((state, i) => (
          <SingleEventFields
            key={i}
            state={state}
            updateState={updateState.bind(null, i)}
            canDelete={i > 0}
            onDelete={() => deleteState(i)}
            keywordOptions={keywordOptions}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStates((states) => [...states, initFormState()])}
          className="ll-btn"
        >
          Add Another Event
        </button>
        <button type="submit" className="ll-btn">
          Submit Events
        </button>
      </div>
    </form>
  );
}
