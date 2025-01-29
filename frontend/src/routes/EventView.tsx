import { useParams } from "react-router-dom";
import useSWR from "swr";

import { EventCard } from "../components/EventCard.tsx";
import { getEvent } from "../helpers/api.ts";

export function EventView() {
  const { id } = useParams();
  const eventSWR = useSWR(["event", id], ([_, id]) => (id ? getEvent(id) : Promise.reject("no id")));
  const event = eventSWR.data;
  if (eventSWR.error) {
    return <div>Error loading event: {String(eventSWR.error)}</div>;
  }
  if (!event) {
    return <div>Loading...</div>;
  }
  return <EventCard event={{ ...event, alert: false }} />;
}
