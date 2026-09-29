export function MentionAutocomplete({ items, activeId, onSelect }) {
  if (!items.length) return null;
  return (
    <ul className="mention-menu" role="listbox" aria-label="Mention someone">
      {items.map((item) => (
        <li key={item.id} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={item.id === activeId}
            aria-disabled={item.disabled || undefined}
            disabled={item.disabled}
            className={item.id === activeId ? "mention-item active" : "mention-item"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <span className="mention-name">{item.label}</span>
            <span className="mention-meta">{item.meta}</span>
            {item.disabled ? <span className="mention-lock">Restricted</span> : <span className="mention-token">@{item.token}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
