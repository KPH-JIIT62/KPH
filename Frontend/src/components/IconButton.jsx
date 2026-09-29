import { cx } from "../lib/format";

export function IconButton({ label, children, pressed, onClick, onMouseDown }) {
  return (
    <button
      type="button"
      className={cx("icon-btn", pressed && "pressed")}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {children}
    </button>
  );
}
