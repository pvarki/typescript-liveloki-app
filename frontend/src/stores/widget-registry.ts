import { create } from "zustand";

import type { WidgetDescriptor } from "../types";

interface WidgetRegistryState {
  widgets: Map<string, WidgetDescriptor>;
  register: (descriptor: WidgetDescriptor) => void;
  get: (type: string) => WidgetDescriptor | undefined;
  getAll: () => WidgetDescriptor[];
}

export const useWidgetRegistry = create<WidgetRegistryState>((set, get) => ({
  widgets: new Map(),
  register: (descriptor) =>
    set((state) => {
      const next = new Map(state.widgets);
      next.set(descriptor.type, descriptor);
      return { widgets: next };
    }),
  get: (type) => get().widgets.get(type),
  getAll: () => [...get().widgets.values()],
}));
