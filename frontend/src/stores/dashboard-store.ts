import { create } from "zustand";

import * as api from "../api/client";
import { sanitizeDashboardSettings } from "../dashboard/dashboard-settings";
import type { DashboardData, DashboardLayout, DashboardSettings, WidgetInstance } from "../types";

interface GridPreview {
  cols: number;
  rowHeight: number;
  settings: DashboardSettings;
}

interface DashboardState {
  dashboards: DashboardData[];
  activeDashboard: DashboardLayout | null;
  isEditMode: boolean;
  selectedWidgetId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  hasLoadedDashboards: boolean;
  gridPreview: GridPreview | null;

  loadDashboards: () => Promise<void>;
  selectDashboard: (id: string) => Promise<void>;
  createDashboard: (name?: string, widgets?: WidgetInstance[]) => Promise<string>;
  deleteDashboard: (id: string) => Promise<void>;
  deleteAllDashboards: () => Promise<void>;
  saveDashboard: () => Promise<void>;

  toggleMode: () => void;
  setEditMode: (edit: boolean) => void;

  setGridPreview: (preview: GridPreview | null) => void;

  addWidget: (widget: WidgetInstance) => void;
  updateWidget: (id: string, updates: Partial<WidgetInstance>) => void;
  removeWidget: (id: string) => void;
  updateWidgetPositions: (
    layouts: { i: string; x: number; y: number; w: number; h: number }[]
  ) => void;
  updateGridConfig: (cols: number, rowHeight: number, settings: DashboardSettings) => void;
  updateName: (name: string) => void;
  selectWidget: (id: string | null) => void;
  updateWidgetConfig: (id: string, config: Record<string, unknown>) => void;
  patchWidgetConfig: (id: string, patch: Record<string, unknown>) => void;
  persistWidgetConfigNow: (id: string, config: Record<string, unknown>) => Promise<void>;
  persistPatchedWidgetConfigNow: (id: string, patch: Record<string, unknown>) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  activeDashboard: null,
  isEditMode: true,
  selectedWidgetId: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  hasLoadedDashboards: false,
  gridPreview: null,

  loadDashboards: async () => {
    const dashboards = await api.listDashboards();
    set({ dashboards, hasLoadedDashboards: true });
  },

  selectDashboard: async (id) => {
    set({ isLoading: true });
    const data = await api.getDashboard(id);
    set({
      activeDashboard: {
        id: data.id,
        name: data.name,
        cols: data.cols,
        rowHeight: data.rowHeight,
        settings: sanitizeDashboardSettings(data.settings),
        widgets: api.parseLayout(data.layout),
      },
      isLoading: false,
      isDirty: false,
      selectedWidgetId: null,
    });
  },

  createDashboard: async (name, widgets) => {
    const data = await api.createDashboard({ name: name || "New Dashboard", widgets });
    await get().loadDashboards();
    return data.id;
  },

  deleteDashboard: async (id) => {
    await api.deleteDashboard(id);
    const { dashboards } = get();
    const remaining = dashboards.filter((d) => d.id !== id);
    set({ dashboards: remaining });
    if (get().activeDashboard?.id === id) {
      set({ activeDashboard: null });
    }
  },

  deleteAllDashboards: async () => {
    await api.deleteAllDashboards();
    set({
      dashboards: [],
      activeDashboard: null,
      selectedWidgetId: null,
      isDirty: false,
      isSaving: false,
      hasLoadedDashboards: true,
    });
  },

  saveDashboard: async () => {
    const { activeDashboard } = get();
    if (!activeDashboard) return;
    set({ isSaving: true });
    await api.updateDashboard(activeDashboard.id, {
      name: activeDashboard.name,
      cols: activeDashboard.cols,
      rowHeight: activeDashboard.rowHeight,
      settings: activeDashboard.settings,
      widgets: activeDashboard.widgets,
    });
    set({
      isDirty: false,
      isSaving: false,
      dashboards: get().dashboards.map((d) =>
        d.id === activeDashboard.id ? { ...d, name: activeDashboard.name } : d
      ),
    });
  },

  toggleMode: () => set((s) => ({ isEditMode: !s.isEditMode, selectedWidgetId: null })),
  setEditMode: (edit) => set({ isEditMode: edit, selectedWidgetId: null }),
  setGridPreview: (preview) => set({ gridPreview: preview }),

  addWidget: (widget) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      return {
        isDirty: true,
        activeDashboard: {
          ...s.activeDashboard,
          widgets: [...s.activeDashboard.widgets, widget],
        },
      };
    }),

  updateWidget: (id, updates) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      return {
        isDirty: true,
        activeDashboard: {
          ...s.activeDashboard,
          widgets: s.activeDashboard.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        },
      };
    }),

  removeWidget: (id) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      return {
        isDirty: true,
        selectedWidgetId: s.selectedWidgetId === id ? null : s.selectedWidgetId,
        activeDashboard: {
          ...s.activeDashboard,
          widgets: s.activeDashboard.widgets.filter((w) => w.id !== id),
        },
      };
    }),

  updateWidgetPositions: (layouts) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      const positionMap = new Map(layouts.map((l) => [l.i, l]));
      return {
        isDirty: true,
        activeDashboard: {
          ...s.activeDashboard,
          widgets: s.activeDashboard.widgets.map((w) => {
            const pos = positionMap.get(w.id);
            if (!pos) return w;
            return {
              ...w,
              gridPosition: { ...w.gridPosition, x: pos.x, y: pos.y, w: pos.w, h: pos.h },
            };
          }),
        },
      };
    }),

  updateGridConfig: (cols, rowHeight, settings) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      return {
        isDirty: true,
        activeDashboard: {
          ...s.activeDashboard,
          cols,
          rowHeight,
          settings: sanitizeDashboardSettings(settings),
        },
      };
    }),

  updateName: (name) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      return {
        isDirty: true,
        activeDashboard: { ...s.activeDashboard, name },
      };
    }),

  selectWidget: (id) => set({ selectedWidgetId: id }),

  updateWidgetConfig: (id, config) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      return {
        isDirty: true,
        activeDashboard: {
          ...s.activeDashboard,
          widgets: s.activeDashboard.widgets.map((w) =>
            w.id === id ? { ...w, config } : w
          ),
        },
      };
    }),

  patchWidgetConfig: (id, patch) =>
    set((s) => {
      if (!s.activeDashboard) return s;
      return {
        isDirty: true,
        activeDashboard: {
          ...s.activeDashboard,
          widgets: s.activeDashboard.widgets.map((w) =>
            w.id === id ? { ...w, config: { ...w.config, ...patch } } : w
          ),
        },
      };
    }),

  persistWidgetConfigNow: async (id, config) => {
    get().updateWidgetConfig(id, config);
    await get().saveDashboard();
  },

  persistPatchedWidgetConfigNow: async (id, patch) => {
    get().patchWidgetConfig(id, patch);
    await get().saveDashboard();
  },
}));
