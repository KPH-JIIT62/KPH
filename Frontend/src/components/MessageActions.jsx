import { useRef, useState } from "react";
import { Bookmark, Copy, MoreHorizontal, Pin, Reply, SmilePlus, Trash2 } from "lucide-react";
import { useDismiss } from "../lib/useDismiss";
import { IconButton } from "./IconButton";

export function MessageActions({
  emojis,
  saved,
  canPin,
  canDelete,
  pinned,
  content,
  onReact,
  onReply,
  onSave,
  onPin,
  onDelete,
}) {
  const [picker, setPicker] = useState(false);
  const [more, setMore] = useState(false);
  const ref = useRef(null);
  useDismiss(picker || more, ref, () => {
    setPicker(false);
    setMore(false);
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(content || "");
    } catch {
      // Clipboard access can be blocked; the message is still on screen.
    }
    setMore(false);
  }

  return (
    <div className="msg-actions" ref={ref}>
      <IconButton label="Add reaction" pressed={picker} onClick={() => { setPicker((open) => !open); setMore(false); }}>
        <SmilePlus size={14} />
      </IconButton>
      {picker ? (
        <div className="emoji-pop" role="menu" aria-label="Reactions">
          {emojis.map((emoji) => (
            <button key={emoji} type="button" className="emoji-choice" onClick={() => { onReact(emoji); setPicker(false); }}>
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
      <IconButton label="Reply in thread" onClick={onReply}>
        <Reply size={14} />
      </IconButton>
      <IconButton label={saved ? "Remove bookmark" : "Save message"} pressed={saved} onClick={onSave}>
        <Bookmark size={14} className={saved ? "filled" : ""} />
      </IconButton>
      <IconButton label="More actions" pressed={more} onClick={() => { setMore((open) => !open); setPicker(false); }}>
        <MoreHorizontal size={14} />
      </IconButton>
      {more ? (
        <div className="pop menu" role="menu">
          <button type="button" onClick={copy}><Copy size={14} /> Copy text</button>
          {canPin ? (
            <button type="button" onClick={() => { onPin(); setMore(false); }}>
              <Pin size={14} /> {pinned ? "Unpin" : "Pin"}
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className="danger" onClick={() => { onDelete(); setMore(false); }}>
              <Trash2 size={14} /> Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
