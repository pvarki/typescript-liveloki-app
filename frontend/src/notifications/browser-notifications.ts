import type { NotificationPayload, NotificationPermissionState } from "./types";

export function getBrowserNotificationPermissionState(): NotificationPermissionState {
  if (globalThis.window === undefined || typeof Notification === "undefined") {
    return "unavailable";
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermissionState> {
  if (globalThis.window === undefined || typeof Notification === "undefined") {
    return "unavailable";
  }

  return Notification.requestPermission();
}

export function sendBrowserNotification(payload: NotificationPayload): boolean {
  if (getBrowserNotificationPermissionState() !== "granted") {
    return false;
  }

  try {
    new Notification(payload.title, {
      body: payload.body,
      tag: `${payload.sourceType}:${payload.sourceId}`,
      data: {
        dashboardId: payload.dashboardId,
        dueAt: payload.dueAt,
      },
    });
    return true;
  } catch {
    return false;
  }
}
