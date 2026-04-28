import { create } from "zustand";

interface StreamStore {
  // convId -> turnIndex -> modelId -> true
  active: Record<string, Record<number, Record<string, boolean>>>;
  stopRequested: Set<string>;
  setStreaming: (convId: string, turn: number, modelId: string, value: boolean) => void;
  requestStop: (convId: string) => void;
  isStreaming: (convId: string, turn: number, modelId: string) => boolean;
  isAnyStreaming: (convId: string) => boolean;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  active: {},
  stopRequested: new Set(),

  setStreaming: (convId, turn, modelId, value) =>
    set((s) => {
      const conv = { ...(s.active[convId] ?? {}) };
      const turnMap = { ...(conv[turn] ?? {}) };
      if (value) turnMap[modelId] = true;
      else delete turnMap[modelId];
      conv[turn] = turnMap;
      if (Object.keys(turnMap).length === 0) delete conv[turn];
      const newActive = { ...s.active, [convId]: conv };
      // Clear stop request once all streams for this conv have ended
      const stillStreaming = Object.values(newActive[convId] ?? {}).some(
        (t) => Object.keys(t).length > 0
      );
      const stopRequested = new Set(s.stopRequested);
      if (!stillStreaming) stopRequested.delete(convId);
      return { active: newActive, stopRequested };
    }),

  requestStop: (convId) =>
    set((s) => {
      const stopRequested = new Set(s.stopRequested);
      stopRequested.add(convId);
      return { stopRequested };
    }),

  isStreaming: (convId, turn, modelId) =>
    !!(get().active[convId]?.[turn]?.[modelId]),

  isAnyStreaming: (convId) => {
    const conv = get().active[convId];
    if (!conv) return false;
    return Object.values(conv).some((t) => Object.keys(t).length > 0);
  },
}));
