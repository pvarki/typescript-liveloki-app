import { Button, Card, Overlay2 } from "@blueprintjs/core";
import useSWR from "swr";

import { EventLink } from "../components/EventLink";
import { EventLocationLink } from "../components/EventLocationLink";
import { EventRelAcc } from "../components/EventRelAcc";
import { Keywords } from "../components/Keywords";
import { getEvent } from "../helpers/api";
import type { FilteredEvent } from "../types";
import { useEventDetailStore } from "./event-detail-store";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="w-40 px-2 py-1 text-left align-top text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </th>
      <td className="px-2 py-1 align-top">{children}</td>
    </tr>
  );
}

function EventDetails({ event }: { event: FilteredEvent }) {
  return (
    <div className="flex max-h-[75vh] flex-col gap-3 overflow-auto text-sm">
      <h2 className="text-lg font-semibold">{event.header}</h2>
      <table className="w-full border-collapse">
        <tbody>
          <DetailRow label="Link">{event.link ? <EventLink event={event} /> : "—"}</DetailRow>
          <DetailRow label="Source">{event.source || "—"}</DetailRow>
          <DetailRow label="Reliability / Accuracy">
            <EventRelAcc event={event} />
          </DetailRow>
          <DetailRow label="Event time">{event.event_time || "—"}</DetailRow>
          <DetailRow label="Creation time">{event.creation_time || "—"}</DetailRow>
          <DetailRow label="Location">
            <EventLocationLink event={event} />
          </DetailRow>
          <DetailRow label="Groups">{event.groups?.length ? event.groups.join(", ") : "—"}</DetailRow>
          <DetailRow label="Keywords">
            <Keywords keywords={event.keywords} />
          </DetailRow>
          <DetailRow label="Domains">
            <Keywords keywords={event.hcoe_domains ?? []} />
          </DetailRow>
          <DetailRow label="Author">{event.author || "—"}</DetailRow>
          <DetailRow label="Notes">
            {event.notes ? <span className="whitespace-pre-wrap">{event.notes}</span> : "—"}
          </DetailRow>
        </tbody>
      </table>
    </div>
  );
}

export default function EventDetailOverlay() {
  const selectedEventId = useEventDetailStore((state) => state.selectedEventId);
  const closeEvent = useEventDetailStore((state) => state.closeEvent);
  const {
    data: event,
    error,
    isLoading,
  } = useSWR(selectedEventId ? ["event", selectedEventId] : null, ([, id]) => getEvent(id));

  return (
    <Overlay2
      isOpen={Boolean(selectedEventId)}
      onClose={closeEvent}
      hasBackdrop
      canEscapeKeyClose
      canOutsideClickClose
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
        <Card className="w-full max-w-3xl !bg-[var(--color-surface)] !text-[var(--color-foreground)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--color-muted-foreground)]">
              Battlelog event detail
            </span>
            <Button icon="cross" minimal onClick={closeEvent} aria-label="Close event details" />
          </div>
          {isLoading && <p className="text-sm text-[var(--color-muted-foreground)]">Loading event...</p>}
          {error && (
            <p className="text-sm text-[var(--color-danger)]">Failed to load event: {String(error)}</p>
          )}
          {event && <EventDetails event={{ ...event, alert: false }} />}
        </Card>
      </div>
    </Overlay2>
  );
}
