import { create } from "zustand";
import { fetchFullProfile } from "@/services/profile";

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
      // Merges the public users/{uid} doc with the owner-only private subdoc
      // (dob/gender) — this always runs for the signed-in user reading their own
      // profile, so the private read is permitted.
      const profile = await fetchFullProfile(uid);

      if (profile) {
        set({ currentUser: profile, isLoading: false });
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
