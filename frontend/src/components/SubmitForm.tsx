import React from "react";
import { mutate } from "swr";

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const events = [];
  for (let i = 0; i < formData.getAll("header").length; i++) {
    events.push({
      header: formData.getAll("header")[i],
      link: formData.getAll("link")[i],
      source: formData.getAll("source")[i],
      admiralty_reliability: formData.getAll("admiralty_reliability")[i],
      admiralty_accuracy: formData.getAll("admiralty_accuracy")[i],
      event_time: formData.getAll("event_time")[i],
      keywords: formData.getAll("keywords")[i],
    });
  }

  try {
    const response = await fetch("events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });

    const result = await response.json();
    if (response.ok) {
      alert("Events submitted successfully");
      void mutate("events"); // Inform SWR cache that the events have changed
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    alert(`Error: ${String(error)}`);
  }
}

function SingleEventFields() {
  return (
    <div className="gap-2 flex flex-wrap">
      <input type="text" name="header" placeholder="Header" required className="ll-input" />
      <input type="text" name="link" placeholder="Link" className="ll-input" />
      <input type="text" name="source" placeholder="Source" className="ll-input" />
      <input type="text" name="admiralty_reliability" placeholder="Reliability" className="ll-input" />
      <input type="text" name="admiralty_accuracy" placeholder="Accuracy" className="ll-input" />
      <input type="datetime-local" name="event_time" placeholder="Event time" className="ll-input" />
      <input type="text" name="keywords" placeholder="Keywords (comma separated)" className="ll-input" />
    </div>
  );
}

export default function SubmitForm() {
  const [nEvents, setNEvents] = React.useState(1);
  return (
    <form className="mb-2" onSubmit={handleSubmit}>
      <div className="mb-2">
        {Array.from({ length: nEvents }).map((_, i) => (
          <SingleEventFields key={i} />
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setNEvents(nEvents + 1)} className="ll-btn">
          Add Another Event
        </button>
        <button type="submit" className="ll-btn">
          Submit Events
        </button>
      </div>
    </form>
  );
}
