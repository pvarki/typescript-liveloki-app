import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AirTrack } from "./types";

export const DEFAULT_TRACK_TTL_MS = 15 * 60 * 1000;

interface AirSurveillanceState {
  tracks: AirTrack[];
  addOrReplaceTrack: (track: AirTrack) => void;
  archiveTrack: (id: string) => void;
  restoreTrack: (id: string, now?: number) => void;
  deleteTrack: (id: string) => void;
  autoArchive: (ttlMs?: number, now?: number) => void;
  clearArchive: () => void;
}

export const useAirSurveillanceStore = create<AirSurveillanceState>()(
  persist(
    (set) => ({
      tracks: [],
      addOrReplaceTrack: (track) =>
        set((state) => {
          const remaining = state.tracks.filter((t) => t.trackId !== track.trackId);
          return { tracks: [...remaining, { ...track, archived: false }] };
        }),
      archiveTrack: (id) =>
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === id ? { ...t, archived: true } : t)),
        })),
      restoreTrack: (id, now = Date.now()) =>
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === id ? { ...t, archived: false, capturedAt: now } : t)),
        })),
      deleteTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
      autoArchive: (ttlMs = DEFAULT_TRACK_TTL_MS, now = Date.now()) =>
        set((state) => {
          let changed = false;
          const next = state.tracks.map((t) => {
            if (t.archived) return t;
            if (now - t.capturedAt < ttlMs) return t;
            changed = true;
            return { ...t, archived: true };
          });
          return changed ? { tracks: next } : state;
        }),
      clearArchive: () =>
        set((state) => ({ tracks: state.tracks.filter((t) => !t.archived) })),
    }),
    { name: "air-surveillance-tracks" },
  ),
);
