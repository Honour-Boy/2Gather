import { create } from "zustand";
import { persist } from "zustand/middleware";

// The user's chosen Bible translation (abbr, e.g. "WEB" | "KJV" | "NIV" …).
// Persisted to localStorage so it sticks across reloads. The backend resolves the
// abbr → bibleId (see backend/translations.js) and returns text in that version.
const useTranslationStore = create(
  persist(
    (set) => ({
      translation: "WEB",
      setTranslation: (translation) => set({ translation }),
    }),
    { name: "2gather-translation" }
  )
);

export default useTranslationStore;
