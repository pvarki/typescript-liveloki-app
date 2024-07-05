import { FilteredEvent } from "../types.ts";
import { EventLink } from "./EventLink.tsx";
import { formatTime } from "../helpers/formatTime.ts";
import { EventLocationLink } from "./EventLocationLink.tsx";
import { Keywords } from "./Keywords.tsx";
import { EventRelAcc } from "./EventRelAcc.tsx";
import { MdLink } from "react-icons/md";
import { Link } from "react-router-dom";
import { useState } from "react";

export function uploadMedia(eventId: number, media: File) {
  const formData = new FormData();
  formData.append("files", media, media?.name);
  formData.append("eventId", eventId.toString());
  return fetch("api/upload", { method: "POST", body: formData });
}

export function EventCard({ event }: { event: FilteredEvent }) {
  const [media, setMedia] = useState<File | null>(null);

    const imageGrid = (
    <div className="grid grid-cols-3 gap-4">
      {(event.images ?? []).map((path, index) => (
        <a href={path} key={index} title="raw image">
          <img className="rounded max-w-72 max-h-72" alt="ze picture" src={path} />
        </a>
      ))}
    </div>
  );

  return (
    <div className="p-2 rounded-sm">
      <h3 className="text-lg font-bold">
        {event.header}
        <Link to={`/event/${event.id}`} className="ps-2 text-pink-400">
          <MdLink className="inline" />
        </Link>
      </h3>
      <table className="ll-event-card-table">
        <tbody>
          <tr>
            <th>Link</th>
            <td>{event.link ? <EventLink event={event} /> : null}</td>
          </tr>
          <tr>
            <th>Source</th>
            <td>{event.source}</td>
          </tr>
          <tr>
            <th>Reliability&#x2009;/&#x2009;Accuracy</th>
            <td>
              <EventRelAcc event={event} />
            </td>
          </tr>
          <tr>
            <th>Event time</th>
            <td>{event.event_time}</td>
          </tr>
          <tr>
            <th>Creation time</th>
            <td title={event.creation_time}>{formatTime(event.creation_time)}</td>
          </tr>
          <tr>
            <th>Location</th>
            <td>
              <EventLocationLink event={event} />
            </td>
          </tr>
          <tr>
            <th>Keywords</th>
            <td>
              <Keywords keywords={event.keywords} />
            </td>
          </tr>
          <tr>
            <th>Domains</th>
            <td>
              <Keywords keywords={event.hcoe_domains ?? []} />
            </td>
          </tr>
        </tbody>
      </table>
      <label htmlFor="media-input">Upload media (image) to attach to the event</label>{" "}
      <input
        id="media-input"
        type="file"
        className="ll-input rounded"
        onChange={(e) => {
          setMedia(e.target.files?.[0] ?? null);
        }}
      />
      <button
        type="button"
        disabled={!media}
        onClick={() => {
          if (media) void uploadMedia(event.id, media);
        }}
        className="ll-btn"
      >
        Upload
      </button>
      <div>{imageGrid}</div>
    </div>
  );
}
