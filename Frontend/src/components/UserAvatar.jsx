export function UserAvatar({ user, size = 28, presence = false }) {
  const initials = user
    ? user.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "?";
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: user?.color || "#2C3442" }}
      aria-hidden="true"
    >
      <span className="avatar-text" style={{ fontSize: size < 26 ? 9 : 11 }}>{initials}</span>
      {presence && <span className={user?.status === "online" ? "presence online" : "presence"} />}
    </span>
  );
}
