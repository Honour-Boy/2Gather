import { useEffect, useRef } from "react";
import usePopupStore, { nextPopupId } from "@/store/popupStore";

// Wire a popup/menu into the global single-active rule.
//
// Pass whether it's currently open and a STABLE close() callback (wrap in
// useCallback). Returns claim(): call it the moment you OPEN so this popup takes
// the only active slot — any other open popup then closes itself. Keeps each
// component's own open state; this just enforces mutual exclusion across them.
export default function useExclusivePopup(isOpen, close) {
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = nextPopupId();
  const id = idRef.current;

  const active = usePopupStore((s) => s.active);
  const claimSlot = usePopupStore((s) => s.open);

  // Another popup claimed the slot while we were open → close ourselves.
  useEffect(() => {
    if (isOpen && active !== id) close();
  }, [active, id, isOpen, close]);

  return () => claimSlot(id);
}
