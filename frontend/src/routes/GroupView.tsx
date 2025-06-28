import useSWR from "swr";
import { useParams } from "react-router-dom";
import { EventsList } from "../components/EventsList.tsx";

export function GroupView() {
  const { groupName } = useParams<{ groupName: string }>();

  // Fetch events for this specific group
  const { data: events, error } = useSWR(
    groupName ? `/api/groups/${encodeURIComponent(groupName)}` : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

  if (error) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl mb-2">Error Loading Group</h1>
        <p className="text-red-400">Failed to load events for group &quot;{groupName}&quot;</p>
      </div>
    );
  }

  if (!events) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl mb-2">Loading Group Events...</h1>
      </div>
    );
  }

  return (
    <>
      <div className="lg:container mx-auto mt-2">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-xl">Group: {groupName}</h1>
          <span className="text-sm text-slate-400">({events.length} events)</span>
        </div>
      </div>
      <EventsList initialEvents={events} />
    </>
  );
} 