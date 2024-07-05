import { FilteredEvent } from "../types.ts";
import { EventLink } from "./EventLink.tsx";
import { formatTime } from "../helpers/formatTime.ts";
import { EventLocationLink } from "./EventLocationLink.tsx";
import { Keywords } from "./Keywords.tsx";
import { EventRelAcc } from "./EventRelAcc.tsx";
import { MdLink } from "react-icons/md";
import { Link } from "react-router-dom";
import { useState } from "react";

export async function uploadMedia(eventId: number, media: File | null) {
  const formData = new FormData();
  if (media) {
    formData.append("files", media, media?.name);
    formData.append("eventId", eventId.toString());
    await fetch("api/upload", { method: "POST", body: formData });
  }
}

export function EventCard({ event }: { event: FilteredEvent }) {
  const [media, setMedia] = useState<File | null>(null);

  const imageGrid = [];
  const elements = (event.images ?? []).map((path, index) => {
    return (
      <a href={path} key={index} title="raw image">
        <img
          style={{ maxHeight: "300px", maxWidth: "300px" }}
          className="rounded"
          alt="ze picture"
          src={path}
        />
      </a>
    );
  });
  const rowLength = 3;
  for (let ii = 0; ii < elements.length; ii += rowLength) {
    imageGrid.push(
      <div className="flex mb-4" key={ii}>
        {elements.slice(ii, ii + rowLength).map((el, index) => {
          return (
            <div className={`w-1/${rowLength} rounded m-4`} key={index}>
              {el}
            </div>
          );
        })}
      </div>,
    );
  }

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
          if (e.target.files) {
            setMedia(e.target.files[0]);
          }
        }}
      />
      <button
        type="button"
        disabled={!media}
        onClick={async () => {
          await uploadMedia(event.id, media);
        }}
        className="ll-btn"
      >
        Upload
      </button>
      <div>{imageGrid}</div>
    </div>
  );
}
