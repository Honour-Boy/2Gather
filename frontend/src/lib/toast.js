import { toast } from "react-toastify";

// App-wide toast helper. Two deliberate behaviors (owner request, 2026-06-04):
//   1. No progress/timer bar — the visual config lives on <Toaster/> (the shared
//      ToastContainer) via `hideProgressBar`.
//   2. A new toast *replaces* the previous one instead of stacking under it: we
//      dismiss any visible toasts first, then show the new one (a fresh id, so
//      the dismiss doesn't touch it).
// Always go through `notify` rather than calling `toast.*` directly so this
// replace-don't-stack behavior holds everywhere.
const show = (type) => (msg, opts) => {
  toast.dismiss();
  return toast[type](msg, opts);
};

const notify = {
  success: show("success"),
  error: show("error"),
  warn: show("warn"),
  info: show("info"),
};

export default notify;
