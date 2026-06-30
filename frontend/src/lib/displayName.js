// The name to show for a user in lists and headers: their full / display name,
// falling back to the @handle WITHOUT the leading "@", then a neutral default.
// Centralized so every surface (chat list, pickers, headers) reads the same.
export function displayName(user, fallback = "Someone") {
  const full = (user?.fullName || "").trim();
  if (full) return full;
  const handle = (user?.username || "").trim().replace(/^@+/, "");
  return handle || fallback;
}
