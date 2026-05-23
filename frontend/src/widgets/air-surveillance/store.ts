import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AirTrack } from "./types";

export const DEFAULT_TRACK_TTL_MS = 15 * 60 * 1000;

interface AirSurveillanceState {
  tracks: AirTrack[];
  addOrReplaceTrack: (track: AirTrack) => void;
  removeTrack: (id: string) => void;
  pruneExpired: (ttlMs?: number, now?: number) => void;
  clearAll: () => void;
}

export const useAirSurveillanceStore = create<AirSurveillanceState>()(
  persist(
    (set) => ({
      tracks: [],
      addOrReplaceTrack: (track) =>
        set((state) => {
          const remaining = state.tracks.filter((t) => t.trackId !== track.trackId);
          return { tracks: [...remaining, track] };
        }),
      removeTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
      pruneExpired: (ttlMs = DEFAULT_TRACK_TTL_MS, now = Date.now()) =>
        set((state) => ({ tracks: state.tracks.filter((t) => now - t.capturedAt < ttlMs) })),
      clearAll: () => set({ tracks: [] }),
    }),
    { name: "air-surveillance-tracks" },
  ),
);
