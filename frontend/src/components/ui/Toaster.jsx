import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Shared toast surface. Single place for the container config so every screen
// renders an identical, bar-less toast. Pair with `notify` from `@/lib/toast`,
// which dismisses the previous toast before showing a new one (replace, not
// stack). `hideProgressBar` removes the timer bar the owner disliked.
const Toaster = () => (
  <ToastContainer position="top-center" theme="dark" hideProgressBar />
);

export default Toaster;
