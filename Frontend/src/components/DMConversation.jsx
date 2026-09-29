import { Menu, Search, Users } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { IconButton } from "./IconButton";
import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";

export function DMConversation({ showNavToggle, onToggleNav }) {
  const { active, conversations, users, roles, me, openSearch, sendMessage } = useWorkspace();
  const conversation = conversations.find((item) => item.id === active.id);
  if (!conversation) {
    return (
      <>
        <header className="header"><h1>Conversation unavailable</h1></header>
        <p className="empty-copy">You don't have access to this conversation.</p>
      </>
    );
  }
  const others = conversation.participantIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user) => user && user.id !== me.id);
  const person = conversation.type === "dm" ? others[0] : null;
  const title = conversation.type === "group" ? conversation.name : person?.name || "Direct message";
  const placeholder = conversation.type === "group" ? `Message ${conversation.name}...` : `Message ${person?.name.split(" ")[0] || "them"}...`;

  return (
    <>
      <header className="header">
        <div className="header-id">
          {showNavToggle ? <IconButton label="Open sidebar" onClick={onToggleNav}><Menu size={16} /></IconButton> : null}
          {person ? <UserAvatar user={person} size={28} presence /> : <Users size={16} />}
          <div>
            <h1>{title}</h1>
            <p className="header-topic">
              {person ? (
                <>
                  <RoleBadge role={person.role} roles={roles} />
                  <span> · {person.status === "online" ? "Online" : "Offline"}</span>
                </>
              ) : (
                <span>{conversation.memberCount} members</span>
              )}
            </p>
          </div>
          {conversation.type === "group" ? (
            <span className="avatar-stack" aria-hidden="true">
              {conversation.participantIds.slice(0, 4).map((id) => {
                const user = users.find((item) => item.id === id);
                return user ? <UserAvatar key={id} user={user} size={18} /> : null;
              })}
            </span>
          ) : null}
        </div>
        <div className="header-actions">
          <IconButton label="Search" onClick={() => openSearch("")}><Search size={16} /></IconButton>
        </div>
      </header>
      <MessageList />
      <MessageComposer inputId="dm-composer" placeholder={placeholder} allowPoll allowProblem={false} onSend={sendMessage} />
    </>
  );
}
