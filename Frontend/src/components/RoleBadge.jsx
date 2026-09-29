export function RoleBadge({ role, roles }) {
  const meta = roles?.find((item) => item.id === role);
  return (
    <span className="role" style={{ color: meta?.color || "#9AA3B2" }}>
      {meta?.label || role}
    </span>
  );
}
