import { create } from "mutative";
import React from "react";
import toast from "react-hot-toast";
import { MdAdd, MdDelete, MdMap, MdPunchClock, MdSend } from "react-icons/md";
import CreatableSelect from "react-select/creatable";
import useSWR, { mutate } from "swr";

import { credibilityScale, reliabilityScale } from "../data/admiralty-code.ts";
import hcoeDomains from "../data/hcoe-domains.ts";
import { getKeywordStatistics, postEvents } from "../helpers/api.ts";
import * as reactSelect from "../helpers/react-select.ts";
import { makeCreateElementOnCommaHandler } from "../helpers/react-select.ts";
import { round } from "../helpers/round.ts";
import { EventPayload } from "../types.ts";
import { AdmiraltySelect, toAdmiraltyOption } from "./AdmiraltySelect.tsx";
import { MapPickerWidget } from "./MapPickerWidget.tsx";

const hcoeDomainOptions = hcoeDomains.map((domain) => ({ value: domain, label: domain }));
const admiraltyReliabilityOptions = Object.entries(reliabilityScale).map(toAdmiraltyOption);
const admiraltyCredibilityOptions = Object.entries(credibilityScale).map(toAdmiraltyOption);

export function SingleEventFields({
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
  const hasPreciseLocation = state.location_lat !== undefined || state.location_lng !== undefined;
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
      <div className="flex gap-2">
        <input
          type="datetime-local"
          name="event_time"
          placeholder="Event time"
          className="ll-input grow"
          onChange={update}
          value={state.event_time}
        />
        <button
          className="ll-btn text-xs"
          onClick={() => updateState({ event_time: new Date().toISOString().replace(/\.\d+Z?$/, "") })}
          type="button"
        >
          <MdPunchClock className="inline mr-2" />
          Now
        </button>
      </div>
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
      <div className="flex flex-row flex-wrap md:flex-nowrap gap-2">
        <input
          type="text"
          name="location"
          placeholder="Location (free text)"
          className="ll-input col-span-2 md:basis-1/2"
          onChange={update}
          value={state.location}
        />
        <div className="flex gap-2 md:contents">
          {/* TODO: would be nice to center the map on the entered coordinates */}
          <input
            type="number"
            name="location_lat"
            min={-90}
            max={90}
            step="any"
            autoComplete="off"
            placeholder="Latitude"
            className="ll-input shrink min-w-12"
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
            className="ll-input shrink min-w-12"
            onChange={update}
            value={state.location_lng ? round(state.location_lng, 4) : ""}
          />
        </div>
        <button
          type="button"
          className="ll-btn text-xs"
          onClick={() => {
            updateState({ location_lat: undefined, location_lng: undefined });
            setShowLocation(false);
          }}
        >
          Clear coords
        </button>
        <button className="ll-btn text-xs" onClick={() => setShowLocation((l) => !l)} type="button">
          <MdMap className="inline mr-2" />
          <span className="text-nowrap">{showLocation ? "Hide" : "Show"} map</span>
        </button>
      </div>
    </div>
  );
  const mapBody = (
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
  );
  return (
    <div className="flex gap-2 items-start">
      <div className="grow flex flex-col gap-2">
        {body}
        {showLocation || hasPreciseLocation ? mapBody : null}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="ll-btn bg-red-700"
        disabled={!canDelete}
        hidden={!canDelete}
      >
        <MdDelete />
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
  const query = fromQuery ? new URLSearchParams(globalThis.location.search) : null;
  const getValue = (key: string) => {
    if (!query) return "";
    const value = query.get(key);
    if (value) {
      query.delete(key);
      return decodeURIComponent(value);
    }
    return "";
  };
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
    author: getValue("author"),
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
    } catch (error) {
      toast.error(String(error));
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
  const [isValid, setIsValid] = React.useState(false);
  return (
    <form
      className="mb-2"
      onSubmit={onSubmit}
      onChange={(event) => setIsValid(event.currentTarget.checkValidity())}
    >
      <div className="mb-2 flex flex-col gap-2">
        {states.map((state, i) => (
          <SingleEventFields
            key={i}
            state={state}
            updateState={updateState.bind(null, i)}
            canDelete={states.length > 1}
            onDelete={() => deleteState(i)}
            keywordOptions={keywordOptions}
          />
        ))}
      </div>
      <div className="flex justify-between gap-2">
        <button type="submit" className="ll-btn" disabled={!isValid}>
          <MdSend className="mr-1 inline" />
          Submit Events
        </button>
        <button
          type="button"
          onClick={() => setStates((states) => [...states, initFormState()])}
          className="ll-btn-secondary"
        >
          <MdAdd className="mr-1 inline" />
          Add Another Event to Batch
        </button>
      </div>
    </form>
  );
}
