import React from "react";
import useSWR, { mutate } from "swr";
import { create } from "mutative";
import { EventPayload } from "../types.ts";
import { getKeywordStatistics, postEvents } from "../helpers/api.ts";

import CreatableSelect from "react-select/creatable";
import hcoeDomains from "../data/hcoe-domains.ts";
import * as reactSelect from "../helpers/react-select.ts";
import { makeCreateElementOnCommaHandler } from "../helpers/react-select.ts";
import toast from "react-hot-toast";
import { MapPickerWidget } from "./MapPickerWidget.tsx";
import { credibilityScale, reliabilityScale } from "../data/admiralty-code.ts";
import { AdmiraltySelect, toAdmiraltyOption } from "./AdmiraltySelect.tsx";
import { round } from "../helpers/round.ts";

const hcoeDomainOptions = hcoeDomains.map((domain) => ({ value: domain, label: domain }));

const admiraltyReliabilityOptions = Object.entries(reliabilityScale).map(toAdmiraltyOption);
const admiraltyCredibilityOptions = Object.entries(credibilityScale).map(toAdmiraltyOption);

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
    <div className="gap-2 grid grid-cols-1 lg:grid-cols-2">
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
      <div className="grid grid-cols-2 gap-2">
        <AdmiraltySelect
          name="admiralty_reliability"
          placeholder="Reliability"
          onChange={(value) => updateState({ admiralty_reliability: value ?? "" })}
          value={state.admiralty_reliability}
          options={admiraltyReliabilityOptions}
        />
        <AdmiraltySelect
          name="admiralty_accuracy"
          placeholder="Accuracy"
          onChange={(value) => updateState({ admiralty_accuracy: value ?? "" })}
          value={state.admiralty_accuracy}
          options={admiraltyCredibilityOptions}
        />
      </div>
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
            step="any"
            autoComplete="off"
            placeholder="Latitude"
            className="ll-input min-w-32"
            onChange={update}
            value={state.location_lat ? round(state.location_lat, 4) : ""}
          />
          <input
            type="number"
            name="location_lng"
            min={-180}
            max={180}
            step="any"
            autoComplete="off"
            placeholder="Longitude"
            className="ll-input min-w-32"
            onChange={update}
            value={state.location_lng ? round(state.location_lng, 4) : ""}
          />
        </div>
      </div>
      <MapPickerWidget
        selected={
          state.location_lng !== undefined && state.location_lat !== undefined
            ? {
                lat: state.location_lat,
                lng: state.location_lng,
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

/**
 * Splits a string by commas and trims whitespace from each part,
 * then filters out empty strings.
 */
function splitStringToArray(x: string) {
  return x
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function initFormState(fromQuery: boolean = false): EventPayload {
  let getValue = (_key: string) => "";
  const query = fromQuery ? new URLSearchParams(window.location.search) : null;
  if (query) {
    getValue = (key: string) => {
      const value = query.get(key);
      if (value) {
        query.delete(key);
        return decodeURIComponent(value);
      }
      return "";
    };
  }
  return {
    header: getValue("header"),
    link: getValue("link"),
    source: getValue("source"),
    admiralty_reliability: getValue("admiralty_reliability"),
    admiralty_accuracy: getValue("admiralty_accuracy"),
    event_time: getValue("event_time"),
    keywords: splitStringToArray(getValue("keywords")),
    hcoe_domains: splitStringToArray(getValue("hcoe_domains")),
    location: getValue("location"),
  };
}

export default function SubmitForm() {
  const keywordsSWR = useSWR("keywords", getKeywordStatistics, {
    revalidateOnFocus: false,
  });
  const [states, setStates] = React.useState<EventPayload[]>([initFormState(true)]);
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
