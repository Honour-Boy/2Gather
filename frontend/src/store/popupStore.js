import { create } from "zustand";

// Global single-active-popup coordinator. Only one popup / menu / context modal
// may hold the `active` slot at a time. Claiming it (open) implicitly evicts any
// other holder, which reacts via useExclusivePopup and closes itself — so two
// overlays can never be open together. IDs are opaque and unique per instance.
let seq = 0;
export const nextPopupId = (prefix = "popup") => `${prefix}-${(seq += 1)}`;

const usePopupStore = create((set) => ({
  active: null,
  open: (id) => set({ active: id }),
  // Release the slot — only if we still hold it (id match), or unconditionally
  // when called with no id.
  close: (id) => set((s) => (id == null || s.active === id ? { active: null } : s)),
}));

export default usePopupStore;
