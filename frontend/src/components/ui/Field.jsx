// Labeled form field wrapper for the auth screens.
const Field = ({ label, htmlFor, children }) => (
  <div>
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-uni-muted mb-1.5 uppercase tracking-wider"
    >
      {label}
    </label>
    {children}
  </div>
);

export default Field;
