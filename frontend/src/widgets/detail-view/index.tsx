import { Card } from "@blueprintjs/core";
import useSWR from "swr";

import { EventLink } from "../../components/EventLink";
import { EventLocationLink } from "../../components/EventLocationLink";
import { EventRelAcc } from "../../components/EventRelAcc";
import { Keywords } from "../../components/Keywords";
import { battlelogDataSource } from "../../data-sources/battlelog";
import { useWidgetParams } from "../../hooks/use-widget-params";
import type { Event, WidgetDescriptor, WidgetProps } from "../../types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="w-32 px-2 py-1 text-left align-top text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </th>
      <td className="px-2 py-1 align-top">{children}</td>
    </tr>
  );
}

function EventDetails({ event }: { event: Event }) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3 text-sm">
      <h3 className="text-base font-semibold">{event.header || "Untitled event"}</h3>
      <table className="w-full border-collapse">
        <tbody>
          <DetailRow label="Link">{event.link ? <EventLink event={event} /> : "—"}</DetailRow>
          <DetailRow label="Source">{event.source || "—"}</DetailRow>
          <DetailRow label="Reliability">
            <EventRelAcc event={event} />
          </DetailRow>
          <DetailRow label="Event time">{event.event_time || "—"}</DetailRow>
          <DetailRow label="Created">{event.creation_time || "—"}</DetailRow>
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

function DetailViewWidget(_: WidgetProps) {
  const { selectedItem } = useWidgetParams();
  const {
    data: event,
    error,
    isLoading,
  } = useSWR(selectedItem ? battlelogDataSource.detailKey(selectedItem) : null, ([, id]) =>
    battlelogDataSource.detailFetcher(id),
  );

  if (!selectedItem) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-[var(--color-muted-foreground)]">
        Select an item to view details.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-[var(--color-muted-foreground)]">
        Loading event details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-[var(--color-danger)]">
        Failed to load event details: {String(error)}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-[var(--color-muted-foreground)]">
        No details found for {selectedItem}.
      </div>
    );
  }

  return (
    <Card className="h-full overflow-hidden !rounded-none !bg-transparent !p-0 !shadow-none">
      <EventDetails event={event} />
    </Card>
  );
}

export const detailViewDescriptor: WidgetDescriptor = {
  type: "detail-view",
  name: "Detail View",
  description: "Persistent Battlelog detail panel driven by selectedItem",
  icon: <span className="text-lg">ℹ</span>,
  defaultSize: { w: 6, h: 6, minW: 4, minH: 3 },
  defaultConfig: {},
  component: DetailViewWidget,
  needsScroll: false,
};
