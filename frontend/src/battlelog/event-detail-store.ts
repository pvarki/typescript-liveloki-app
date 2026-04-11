import { create } from "zustand";

interface EventDetailState {
  selectedEventId: string | null;
  openEvent: (id: number | string) => void;
  closeEvent: () => void;
}

export const useEventDetailStore = create<EventDetailState>((set) => ({
  selectedEventId: null,
  openEvent: (id) => set({ selectedEventId: String(id) }),
  closeEvent: () => set({ selectedEventId: null }),
}));
