import { useCallback, useRef } from "react";

// Long-press detection for touch (the mobile counterpart to right-click). Returns
// touch handlers to spread onto an element; `onLongPress` fires after `ms` unless
// the finger lifts or moves first (a scroll shouldn't trigger it). Mouse/right-
// click is handled separately via onContextMenu by the caller.
export default function useLongPress(onLongPress, ms = 450) {
  const timer = useRef(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (e) => {
      firedRef.current = false;
      const point = e.touches?.[0];
      timer.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress(point);
      }, ms);
    },
    [onLongPress, ms]
  );

  return {
    onTouchStart: start,
    onTouchMove: clear,
    onTouchEnd: clear,
    onTouchCancel: clear,
  };
}
