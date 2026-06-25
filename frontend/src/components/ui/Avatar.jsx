// Shared avatar primitive. Renders the user's uploaded image (a base64 data
// URL stored on `users/{uid}.avatarUrl`) when present, otherwise falls back to
// their initials over the brand gradient. Sizing/text classes are passed via
// `className` so callers keep the existing `!w-X !h-Y` overrides.

// First + last name initials (e.g. "John Doe" -> "JD"); a single name falls
// back to its first two letters ("John" -> "JO").
const initialsFor = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0].charAt(0);
  const second =
    parts.length > 1 ? parts[parts.length - 1].charAt(0) : parts[0].charAt(1);
  return (first + (second || "")).toUpperCase();
};

const Avatar = ({ user, name, avatarUrl, small = false, className = "", fallback = "U" }) => {
  const displayName = name ?? user?.fullName ?? "";
  const url = avatarUrl ?? user?.avatarUrl ?? "";
  const base = small ? "user-avatar-small" : "user-avatar";
  const initials = initialsFor(displayName) || fallback;

  return (
    <div className={`${base} overflow-hidden ${className}`}>
      {url ? (
        <img
          src={url}
          alt={displayName || "avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default Avatar;
