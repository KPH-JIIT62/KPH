import { useRef, useState } from "react";
import { Info, Menu, Pin, Search, Users, X } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatDay, previewText } from "../lib/format";
import { IconButton } from "./IconButton";
import { useDismiss } from "../lib/useDismiss";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";

export function ChannelHeader({ showNavToggle, onToggleNav }) {
  const { active, channels, messages, users, roles, me, can, openSearch, openThread } = useWorkspace();
  const channel = channels.find((item) => item.id === active.id);
  const [panel, setPanel] = useState(null);
  const actionsRef = useRef(null);
  useDismiss(Boolean(panel), actionsRef, () => setPanel(null));
  if (!channel) {
    return (
      <header className="header">
        <h1>Channel unavailable</h1>
      </header>
    );
  }

  const pins = messages.filter((message) => message.isPinned && !message.deleted);
  const online = users.filter((user) => user.status === "online").length;

  function toggle(name) {
    setPanel((current) => (current === name ? null : name));
  }

  function openPin(message) {
    setPanel(null);
    const node = document.getElementById(`msg-${message.id}`);
    if (node) {
      node.scrollIntoView({ block: "center" });
      node.classList.add("flash");
      window.setTimeout(() => node.classList.remove("flash"), 1400);
    }
    if (message.parentId) openThread(message.parentId);
  }

  return (
    <header className="header">
      <div className="header-id">
        {showNavToggle ? (
          <IconButton label="Open sidebar" onClick={onToggleNav}><Menu size={16} /></IconButton>
        ) : null}
        <div>
          <h1>#{channel.name}</h1>
          <p className="header-topic">{channel.description}</p>
        </div>
      </div>
      <div className="header-actions" ref={actionsRef}>
        <IconButton label="Search channel" onMouseDown={(event) => event.stopPropagation()} onClick={() => { setPanel(null); openSearch(channel.id); }}>
          <Search size={16} />
        </IconButton>
        <IconButton label="Pinned messages" pressed={panel === "pins"} onMouseDown={(event) => event.stopPropagation()} onClick={() => toggle("pins")}>
          <Pin size={16} />
        </IconButton>
        <IconButton label="Members" pressed={panel === "members"} onMouseDown={(event) => event.stopPropagation()} onClick={() => toggle("members")}>
          <Users size={16} />
        </IconButton>
        <IconButton label="Channel information" pressed={panel === "info"} onMouseDown={(event) => event.stopPropagation()} onClick={() => toggle("info")}>
          <Info size={16} />
        </IconButton>
        {panel ? (
          <section className="popover" aria-label={panel === "pins" ? "Pinned messages" : panel === "members" ? "Members" : "Channel information"}>
            <header>
              <h2>{panel === "pins" ? "Pinned messages" : panel === "members" ? "Members" : "Channel"}</h2>
              <button type="button" className="icon-btn" aria-label="Close panel" onClick={() => setPanel(null)}><X size={14} /></button>
            </header>
            {panel === "pins" ? (
              pins.length ? (
                <ul className="pin-list">
                  {pins.map((message) => {
                    const author = users.find((user) => user.id === message.authorId);
                    return (
                      <li key={message.id}>
                        <button type="button" className="pin-item" onClick={() => openPin(message)}>
                          <span className="pin-preview">{previewText(message)}</span>
                          <span className="pin-meta">{author?.name || "Unknown"} · {formatDay(message.createdAt)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="empty-copy">No pinned messages in this channel.</p>
            ) : null}
            {panel === "members" ? (
              <>
                <p className="panel-note">{online} online · {users.length} people</p>
                <ul className="member-list">
                  {[...users].sort((a, b) => Number(b.status === "online") - Number(a.status === "online") || a.name.localeCompare(b.name)).map((user) => (
                    <li key={user.id} className="member-row">
                      <UserAvatar user={user} size={24} presence />
                      <span>
                        <span className="author">{user.name}</span>
                        <RoleBadge role={user.role} roles={roles} />
                      </span>
                      <span className="status-text">{user.status === "online" ? "Online" : "Offline"}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {panel === "info" ? (
              <div className="info-copy">
                <p>{channel.topic}</p>
                <p className="pin-meta">{channel.category}</p>
                <p className="pin-meta">Signed in as {me.name} · {me.role}</p>
                {can("moderate_messages") ? <p className="pin-meta">You can moderate messages in this workspace.</p> : null}
                {can("manage_channels") ? <p className="pin-meta">You can add channels.</p> : null}
                {can("problem_setting") ? <p className="pin-meta">Problem-setting tools are available to your role.</p> : null}
                {can("oversight") ? <p className="pin-meta">Faculty oversight is enabled on this account.</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </header>
  );
}
