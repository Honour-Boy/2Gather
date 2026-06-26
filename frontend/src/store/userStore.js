import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure the correct path to firebase.js
import { create } from "zustand";

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
