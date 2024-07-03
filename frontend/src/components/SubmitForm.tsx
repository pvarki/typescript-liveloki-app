import React from "react";
import useSWR, { mutate } from "swr";
import { create } from "mutative";
import { EventPayload } from "../types.ts";
import { getKeywordStatistics, postEvents } from "../helpers/api.ts";

import CreatableSelect from "react-select/creatable";
import hcoeDomains from "../data/hcoe-domains.ts";
import * as reactSelectStyle from "../helpers/react-select-style.ts";
import toast from "react-hot-toast";
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
  const update = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateState({ [event.target.name]: event.target.value });
    },
    [state, updateState],
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
        {...reactSelectStyle.props}
        value={state.keywords.map((keyword) => ({ value: keyword, label: keyword }))}
        onChange={(keywords) => updateState({ keywords: keywords.map((k) => k.value) })}
      />
      <CreatableSelect
        isMulti
        placeholder="HCOE Domains"
        options={hcoeDomainOptions}
        {...reactSelectStyle.props}
        value={state.hcoe_domains.map((domain) => ({ value: domain, label: domain }))}
        onChange={(domains) => updateState({ hcoe_domains: domains.map((domain) => domain.value) })}
      />
    </div>
  );
  return (
    <div className="flex gap-2">
      <div className="grow">{body}</div>
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
