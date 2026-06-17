import { create } from "zustand";

import {
  getBrowserNotificationPermissionState,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "./browser-notifications";
import {
  dismissNotificationsForSource,
  dismissOverdueNotification,
  filterNotificationsByDashboard,
  resolveNotificationDecision,
  upsertOverdueNotification,
} from "./notification-policy";
import type {
  NotificationItem,
  NotificationPermissionState,
  NotificationSource,
} from "./types";

const STORAGE_KEY = "dashboard-overdue-notifications-v1";

function readStoredItems(): NotificationItem[] {
  if (globalThis.window === undefined) return [];

  const raw = globalThis.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as NotificationItem[];
  } catch {
    return [];
  }
}

function persistItems(items: NotificationItem[]) {
  if (globalThis.window === undefined) return;
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface NotificationStoreState {
  overdueItems: NotificationItem[];
  permission: NotificationPermissionState;
  hydrate: () => void;
  requestPermission: () => Promise<NotificationPermissionState>;
  dismiss: (id: string) => void;
  dismissBySource: (sourceType: string, sourceId: string) => void;
  queueOverdue: (source: NotificationSource, createdAt?: string) => void;
  deliverOrQueue: (
    source: NotificationSource,
    createdAt?: string
  ) => { delivered: boolean; queued: boolean };
  getVisibleForDashboard: (dashboardId: string | null | undefined) => NotificationItem[];
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  overdueItems: readStoredItems(),
  permission: getBrowserNotificationPermissionState(),
  hydrate: () =>
    set({
      overdueItems: readStoredItems(),
      permission: getBrowserNotificationPermissionState(),
    }),
  requestPermission: async () => {
    const permission = await requestBrowserNotificationPermission();
    set({ permission });
    return permission;
  },
  dismiss: (id) =>
    set((state) => {
      const next = dismissOverdueNotification(
        state.overdueItems,
        id,
        new Date().toISOString()
      );
      persistItems(next);
      return { overdueItems: next };
    }),
  dismissBySource: (sourceType, sourceId) =>
    set((state) => {
      const next = dismissNotificationsForSource(
        state.overdueItems,
        sourceType,
        sourceId,
        new Date().toISOString()
      );
      persistItems(next);
      return { overdueItems: next };
    }),
  queueOverdue: (source, createdAt = new Date().toISOString()) =>
    set((state) => {
      const next = upsertOverdueNotification(state.overdueItems, source, createdAt);
      persistItems(next);
      return { overdueItems: next };
    }),
  deliverOrQueue: (source, createdAt = new Date().toISOString()) => {
    const permission = getBrowserNotificationPermissionState();
    const strategy = resolveNotificationDecision(permission);
    set({ permission });

    if (strategy === "deliver" && sendBrowserNotification(source)) {
      return { delivered: true, queued: false };
    }

    get().queueOverdue(source, createdAt);
    return { delivered: false, queued: true };
  },
  getVisibleForDashboard: (dashboardId) =>
    filterNotificationsByDashboard(get().overdueItems, dashboardId),
}));
