import { create } from "zustand";

interface AirTrackVisibilityState {
  visibleTrackIds: ReadonlySet<string>;
  toggle: (trackId: string) => void;
  show: (trackId: string) => void;
  hide: (trackId: string) => void;
  clear: () => void;
}

export const useAirTrackVisibilityStore = create<AirTrackVisibilityState>((set) => ({
  visibleTrackIds: new Set(),
  toggle: (trackId) =>
    set((state) => {
      const next = new Set(state.visibleTrackIds);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return { visibleTrackIds: next };
    }),
  show: (trackId) =>
    set((state) => {
      if (state.visibleTrackIds.has(trackId)) return state;
      const next = new Set(state.visibleTrackIds);
      next.add(trackId);
      return { visibleTrackIds: next };
    }),
  hide: (trackId) =>
    set((state) => {
      if (!state.visibleTrackIds.has(trackId)) return state;
      const next = new Set(state.visibleTrackIds);
      next.delete(trackId);
      return { visibleTrackIds: next };
    }),
  clear: () => set({ visibleTrackIds: new Set() }),
}));
