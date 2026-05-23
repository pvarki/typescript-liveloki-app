import { Button, Callout } from "@blueprintjs/core";
import { useEffect, useMemo } from "react";

import { useDashboardStore } from "../stores/dashboard-store";
import { filterNotificationsForDashboard } from "./notification-policy";
import { useNotificationStore } from "./notification-store";

function formatDueTime(dueAt: string): string {
  const date = new Date(dueAt);
  return Number.isNaN(date.getTime())
    ? "unknown time"
    : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function NotificationHost() {
  const activeDashboardId = useDashboardStore((s) => s.activeDashboard?.id ?? null);
  const overdueItems = useNotificationStore((s) => s.overdueItems);
  const hydrate = useNotificationStore((s) => s.hydrate);
  const dismiss = useNotificationStore((s) => s.dismiss);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const visibleItems = useMemo(
    () => filterNotificationsForDashboard(overdueItems, activeDashboardId),
    [activeDashboardId, overdueItems],
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-[var(--color-separator)] bg-[var(--color-surface)] px-3 py-2">
      <div className="flex flex-col gap-2">
        {visibleItems.map((item) => (
          <Callout key={item.id} intent="warning" className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{item.body}</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Overdue since {formatDueTime(item.dueAt)}
              </p>
            </div>
            <Button type="button" className="shrink-0 text-xs" size="small" onClick={() => dismiss(item.id)}>
              Dismiss
            </Button>
          </Callout>
        ))}
      </div>
    </div>
  );
}
