// Smoke/render test for a pure presentational component. Deliberately uses a
// component with no Firebase / import.meta.env dependency so it exercises the full
// frontend harness — ESM imports, JSX transform, jsdom, and Testing Library — in
// isolation, without booting the whole app.
import { render } from '@testing-library/react';
import LoadingSpinner from '@/components/common/LoadingComponent';

test('renders the loading spinner without crashing', () => {
  const { container } = render(<LoadingSpinner />);
  // The wrapper div is always present; the spinner mounts inside it.
  expect(container.firstChild).toBeInTheDocument();
  expect(container.querySelector('span')).toBeInTheDocument();
});

test('passes a custom size through to the spinner', () => {
  const { container } = render(<LoadingSpinner size={64} />);
  expect(container.firstChild).toBeInTheDocument();
});
