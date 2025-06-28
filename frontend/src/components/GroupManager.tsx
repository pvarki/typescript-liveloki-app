import { useState } from "react";
import useSWR from "swr";

import { getEvents } from "../helpers/api.ts";
import type { Event, Group } from "../types.ts";

export function GroupManager() {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [filterType, setFilterType] = useState<"manual" | "keywords" | "domains">("manual");
  const [filterValue, setFilterValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch events and groups
  const { data: events } = useSWR("events", getEvents);
  const { data: groups, mutate: mutateGroups } = useSWR("api/groups", (url: string) =>
    fetch(url).then((res) => res.json()),
  );

  const handleEventSelect = (eventId: string) => {
    setSelectedEvents((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleSelectByFilter = () => {
    if (!events || !filterValue.trim()) return;

    const filteredEvents = events.filter((event: Event) => {
      switch (filterType) {
        case "keywords": {
          return event.keywords?.some((keyword) => keyword.toLowerCase().includes(filterValue.toLowerCase()));
        }
        case "domains": {
          return event.hcoe_domains?.some((domain) =>
            domain.toLowerCase().includes(filterValue.toLowerCase()),
          );
        }
        default: {
          return false;
        }
      }
    });

    const eventIds = filteredEvents.map((event: Event) => event.id.toString());
    setSelectedEvents(new Set(eventIds));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedEvents.size === 0) return;

    try {
      const response = await fetch("api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventIds: [...selectedEvents],
          groupName: groupName.trim(),
        }),
      });

      if (response.ok) {
        setGroupName("");
        setSelectedEvents(new Set());
        mutateGroups();
        // Refresh events to show updated group assignments
        globalThis.location.reload();
      } else {
        const error = await response.json();
        alert(`Error creating group: ${error.error}`);
      }
    } catch (error) {
      alert(`Error creating group: ${error}`);
    }
  };

  const handleRemoveFromGroup = async (eventId: string, groupName: string) => {
    try {
      const response = await fetch(`api/events/${eventId}/group`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupName }),
      });

      if (response.ok) {
        mutateGroups();
        // Refresh events to show updated group assignments
        globalThis.location.reload();
      } else {
        const error = await response.json();
        alert(`Error removing from group: ${error.error}`);
      }
    } catch (error) {
      alert(`Error removing from group: ${error}`);
    }
  };

  if (!events) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Toggle Header */}
      <div className="bg-slate-800 p-4 rounded">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Event Group Manager</h2>
          <button onClick={() => setIsExpanded(!isExpanded)} className="ll-btn text-sm">
            {isExpanded ? "Hide" : "Show"} Group Management
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-2 text-sm text-slate-300">
          {groups && groups.length > 0 && <span className="mr-4">Groups: {groups.length}</span>}
          <span>Selected: {selectedEvents.size} events</span>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div>
          {/* Filter Section */}
          <div className="bg-slate-800 p-4 rounded">
            <h3 className="text-md font-medium mb-2">Select Events by Filter</h3>
            <div className="flex gap-2 mb-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "manual" | "keywords" | "domains")}
                className="ll-input"
              >
                <option value="manual">Manual Selection</option>
                <option value="keywords">By Keywords</option>
                <option value="domains">By HCOE Domains</option>
              </select>
              <input
                type="text"
                placeholder="Filter value..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="ll-input grow"
              />
              <button onClick={handleSelectByFilter} className="ll-btn" disabled={!filterValue.trim()}>
                Apply Filter
              </button>
            </div>
          </div>

          {/* Group Creation */}
          <div className="bg-slate-800 p-4 rounded">
            <h3 className="text-md font-medium mb-2">Add to Group</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="ll-input grow"
              />
              <button
                onClick={handleCreateGroup}
                className="ll-btn"
                disabled={!groupName.trim() || selectedEvents.size === 0}
              >
                Add to Group ({selectedEvents.size} events)
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-slate-800 p-4 rounded">
            <h3 className="text-md font-medium mb-4">Events</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event: Event) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                    selectedEvents.has(event.id.toString())
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 hover:bg-slate-600"
                  }`}
                  onClick={() => handleEventSelect(event.id.toString())}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(event.id.toString())}
                    onChange={() => handleEventSelect(event.id.toString())}
                    className="mr-2"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{event.header}</div>
                    <div className="text-sm text-slate-400">
                      {event.groups && event.groups.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.groups.map((group, index) => (
                            <span key={index} className="text-green-400">
                              {group}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {event.groups && event.groups.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {event.groups.map((group, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromGroup(event.id.toString(), group);
                          }}
                          className="ll-btn text-xs"
                        >
                          Remove from {group}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Groups List */}
          {groups && groups.length > 0 && (
            <div className="bg-slate-800 p-4 rounded">
              <h3 className="text-md font-medium mb-4">Existing Groups</h3>
              <div className="space-y-2">
                {groups.map((group: Group) => (
                  <div
                    key={group.group_name}
                    className="flex justify-between items-center p-2 bg-slate-700 rounded"
                  >
                    <span className="font-medium">{group.group_name}</span>
                    <span className="text-sm text-slate-400">{group.event_count} events</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
