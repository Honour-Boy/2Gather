import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure the correct path to firebase.js
import { create } from "zustand";

const useUserStore = create((set, get) => ({
  currentUser: null,
  isLoading: true,

  fetchUserInfo: async (uid) => {
    if (!uid) {
      set({ currentUser: null, isLoading: false });
      return;
    }

    // Show the blocking loader only on first load / account switch. A token
    // refresh re-fetches with a profile already in hand, so we don't want to
    // flash a loader (and have the route guards bounce) on every refresh.
    const existing = get().currentUser;
    if (!existing || existing.id !== uid) set({ isLoading: true });

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        set({ currentUser: docSnap.data(), isLoading: false });
      } else {
        // Not an error: a brand-new account (e.g. a fresh Google sign-in) has
        // no profile doc yet. The route guards send these users to onboarding.
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
