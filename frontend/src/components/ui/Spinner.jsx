// Small inline loading spinner used across auth forms and the chat send button.
const Spinner = ({ size = 18 }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path
      d="M21 12a9 9 0 0 1-9 9"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export default Spinner;
