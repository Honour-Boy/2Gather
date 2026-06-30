import { render, screen, fireEvent } from "@testing-library/react";
import { useCallback, useState } from "react";
import useExclusivePopup from "@/hooks/useExclusivePopup";
import usePopupStore from "@/store/popupStore";

// A minimal popup harness using the hook.
function Popup({ name }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const claim = useExclusivePopup(open, close);
  return (
    <div>
      <button
        onClick={() => {
          setOpen(true);
          claim();
        }}
      >
        open-{name}
      </button>
      {open && <div>panel-{name}</div>}
    </div>
  );
}

afterEach(() => usePopupStore.getState().close()); // release the slot between tests

test("opening one popup closes any other that was open", () => {
  render(
    <>
      <Popup name="A" />
      <Popup name="B" />
    </>
  );

  fireEvent.click(screen.getByText("open-A"));
  expect(screen.getByText("panel-A")).toBeInTheDocument();

  fireEvent.click(screen.getByText("open-B"));
  expect(screen.getByText("panel-B")).toBeInTheDocument();
  expect(screen.queryByText("panel-A")).not.toBeInTheDocument(); // A was evicted
});

test("a popup left alone stays open", () => {
  render(<Popup name="solo" />);
  fireEvent.click(screen.getByText("open-solo"));
  expect(screen.getByText("panel-solo")).toBeInTheDocument();
});
