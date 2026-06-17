export type NotificationPermissionState = NotificationPermission | "unavailable";
export type NotificationDeliveryStrategy = "deliver" | "queue";
export type NotificationStatus = "overdue" | "dismissed";

export interface NotificationSource {
  dashboardId: string;
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  dueAt: string;
}

export type NotificationPayload = NotificationSource;

export interface NotificationItem extends NotificationSource {
  id: string;
  status: NotificationStatus;
  createdAt: string;
  dismissedAt: string | null;
}
