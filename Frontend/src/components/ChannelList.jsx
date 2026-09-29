import { Hash } from "lucide-react";
import { cx } from "../lib/format";

export function ChannelList({ channels, activeId, onSelect }) {
  return (
    <ul className="channel-list">
      {channels.map((channel) => {
        const selected = channel.id === activeId;
        return (
          <li key={channel.id}>
            <button
              type="button"
              className={cx("channel", selected && "active")}
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(channel.id)}
            >
              <Hash size={14} />
              <span className="channel-name">{channel.name}</span>
              {channel.unread > 0 ? <span className="unread">{channel.unread}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
