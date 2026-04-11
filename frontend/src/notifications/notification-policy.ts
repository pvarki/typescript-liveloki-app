import type {
  NotificationDeliveryStrategy,
  NotificationItem,
  NotificationPayload,
  NotificationPermissionState,
} from "./types";

export function getNotificationDeliveryStrategy(
  permission: NotificationPermissionState
): NotificationDeliveryStrategy {
  return permission === "granted" ? "deliver" : "queue";
}

export const resolveNotificationDecision = getNotificationDeliveryStrategy;

export function buildNotificationId(payload: NotificationPayload): string {
  return [payload.dashboardId, payload.sourceType, payload.sourceId, payload.dueAt].join(":");
}

export function createOverdueNotification(
  payload: NotificationPayload,
  createdAt: string
): NotificationItem {
  return {
    ...payload,
    id: buildNotificationId(payload),
    status: "overdue",
    createdAt,
    dismissedAt: null,
  };
}

export function upsertQueuedNotification(
  items: NotificationItem[],
  payload: NotificationPayload,
  createdAt: string
): NotificationItem[] {
  const id = buildNotificationId(payload);
  if (items.some((item) => item.id === id)) {
    return items;
  }

  return [...items, createOverdueNotification(payload, createdAt)];
}

export const upsertOverdueNotification = upsertQueuedNotification;

export function dismissNotificationItem(
  items: NotificationItem[],
  id: string,
  dismissedAt: string
): NotificationItem[] {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "dismissed",
          dismissedAt,
        }
      : item
  );
}

export const dismissOverdueNotification = dismissNotificationItem;

export function dismissNotificationsForSource(
  items: NotificationItem[],
  sourceType: string,
  sourceId: string,
  dismissedAt: string
): NotificationItem[] {
  return items.map((item) =>
    item.sourceType === sourceType && item.sourceId === sourceId
      ? {
          ...item,
          status: "dismissed",
          dismissedAt,
        }
      : item
  );
}

export function filterNotificationsForDashboard(
  items: NotificationItem[],
  dashboardId: string | null | undefined
): NotificationItem[] {
  if (!dashboardId) return [];

  return items.filter(
    (item) => item.dashboardId === dashboardId && item.status !== "dismissed"
  );
}

export const filterNotificationsByDashboard = filterNotificationsForDashboard;
