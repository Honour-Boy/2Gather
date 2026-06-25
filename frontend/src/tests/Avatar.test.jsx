// Unit tests for the shared Avatar primitive: it should render the uploaded
// image when an avatarUrl is present, and fall back to initials otherwise.
import { render, screen } from "@testing-library/react";
import Avatar from "@/components/ui/Avatar";

test("renders the uploaded image when avatarUrl is set", () => {
  render(<Avatar name="John Doe" avatarUrl="data:image/jpeg;base64,abc" />);
  const img = screen.getByRole("img");
  expect(img).toHaveAttribute("src", "data:image/jpeg;base64,abc");
});

test("falls back to first+last initials when there is no image", () => {
  const { container } = render(<Avatar name="John Doe" />);
  expect(screen.queryByRole("img")).toBeNull();
  expect(container.textContent).toBe("JD");
});

test("uses the first two letters for a single-word name", () => {
  const { container } = render(<Avatar name="John" />);
  expect(container.textContent).toBe("JO");
});

test("shows the fallback glyph when no name is provided", () => {
  const { container } = render(<Avatar fallback="?" />);
  expect(container.textContent).toBe("?");
});

test("reads name and avatarUrl off a user object", () => {
  render(<Avatar user={{ fullName: "Ada Lovelace", avatarUrl: "data:x" }} />);
  expect(screen.getByRole("img")).toHaveAttribute("alt", "Ada Lovelace");
});
