import { create } from "zustand";
import { persist } from "zustand/middleware";

// The user's active life-situation Mode (Phase 4). Persisted to localStorage so
// it survives reloads. `activeMode` is a MODES id (see @/lib/modes) or null
// ("general" — no theme filter).
const useModeStore = create(
  persist(
    (set) => ({
      activeMode: null,
      setMode: (id) => set({ activeMode: id }),
      clearMode: () => set({ activeMode: null }),
    }),
    { name: "2gather-active-mode" }
  )
);

export default useModeStore;
