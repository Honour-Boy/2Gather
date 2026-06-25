import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure the correct path to firebase.js
import { create } from "zustand";
import { UI_LANGUAGES, setUiLanguage } from "@/lib/i18n";

// Language-first: a signed-in user's stored profile `language` is the source of
// truth for the UI language and is applied on every load — it wins over the
// landing-screen switcher (which is just for pre-login browsing). The only way
// to change it afterward is from the profile (Settings). Lazy-loads the catalog;
// falls back to English for languages without one.
const syncUiLanguage = (language) => {
  try {
    if (language && UI_LANGUAGES.includes(language)) {
      setUiLanguage(language);
    }
  } catch {
    /* localStorage/i18n unavailable — ignore */
  }
};

const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,

  fetchUserInfo: async (uid) => {
    if (!uid) {
      set({ currentUser: null, isLoading: false });
      return;
    }

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        set({ currentUser: data, isLoading: false });
        syncUiLanguage(data.language);
      } else {
        console.error("No such document!");
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
      set({ currentUser: null, isLoading: false });
    }
  },

  clearUserInfo: () => {
    set({ currentUser: null, isLoading: false });
  },
}));

export default useUserStore;
