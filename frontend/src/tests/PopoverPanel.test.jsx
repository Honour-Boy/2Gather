import { render, screen, fireEvent } from "@testing-library/react";
import PopoverPanel from "@/components/ui/PopoverPanel";

test("renders the title and children", () => {
  render(
    <PopoverPanel title="Share a verse" onClose={() => {}}>
      <div>panel body</div>
    </PopoverPanel>
  );
  expect(screen.getByText("Share a verse")).toBeInTheDocument();
  expect(screen.getByText("panel body")).toBeInTheDocument();
});

test("clicking outside (the backdrop) closes; clicking inside does not", () => {
  const onClose = jest.fn();
  render(
    <PopoverPanel title="X" onClose={onClose}>
      <button>inside</button>
    </PopoverPanel>
  );

  fireEvent.click(screen.getByText("inside")); // inside the panel
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("dialog")); // the backdrop
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("the close button closes", () => {
  const onClose = jest.fn();
  render(<PopoverPanel title="X" onClose={onClose}>body</PopoverPanel>);
  fireEvent.click(screen.getByLabelText("Close"));
  expect(onClose).toHaveBeenCalled();
});
