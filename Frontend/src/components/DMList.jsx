import { Users } from "lucide-react";
import { cx } from "../lib/format";
import { UserAvatar } from "./UserAvatar";

export function DMList({ conversations, users, meId, activeId, onSelect }) {
  return (
    <ul className="channel-list">
      {conversations.map((conversation) => {
        const others = conversation.participantIds.map((id) => users.find((user) => user.id === id)).filter((user) => user && user.id !== meId);
        const title = conversation.type === "group" ? conversation.name : others[0]?.name || "Direct message";
        const person = conversation.type === "dm" ? others[0] : null;
        const selected = conversation.id === activeId;
        return (
          <li key={conversation.id}>
            <button
              type="button"
              className={cx("channel dm", selected && "active")}
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(conversation.id)}
            >
              {person ? <UserAvatar user={person} size={18} presence /> : <Users size={14} />}
              <span className="channel-name">{title}</span>
              {person ? <span className="sr">{person.status === "online" ? "Online" : "Offline"}</span> : null}
              {conversation.unread > 0 ? <span className="unread">{conversation.unread}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
