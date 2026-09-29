import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Bookmark, PanelLeftClose, Plus, Search, Settings, X } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useDismiss } from "../lib/useDismiss";
import { cx, formatTime } from "../lib/format";
import { ChannelList } from "./ChannelList";
import { DMList } from "./DMList";
import { IconButton } from "./IconButton";
import { RoleBadge } from "./RoleBadge";
import { SpaceSection } from "./SpaceSection";
import { UserAvatar } from "./UserAvatar";

export function Sidebar({ onCollapse }) {
  const ws = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const settingsRef = useRef(null);
  const notesRef = useRef(null);
  useDismiss(settingsOpen, settingsRef, () => setSettingsOpen(false));
  useDismiss(notesOpen, notesRef, () => setNotesOpen(false));
  const unreadNotes = ws.notifications.filter((item) => !item.read).length;
  const dms = ws.conversations.filter((conversation) => conversation.type === "dm");
  const groups = ws.conversations.filter((conversation) => conversation.type === "group");

  return (
    <aside className="sidebar" aria-label="Community workspace">
      <div className="brand-row">
        <div>
          <div className="brand-mark">CODING HUB</div>
          <div className="brand-sub">Community Workspace</div>
        </div>
        <div className="brand-actions">
          <div className="pop-anchor" ref={notesRef}>
            <IconButton
              label={unreadNotes ? `Notifications, ${unreadNotes} unread` : "Notifications"}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => { setNotesOpen((open) => !open); setSettingsOpen(false); }}
            >
              <Bell size={16} />
              {unreadNotes ? <span className="dot-count">{unreadNotes}</span> : null}
            </IconButton>
            {notesOpen ? (
              <div className="popover notes-pop" role="dialog" aria-label="Notifications">
                <header>
                  <h2>Notifications</h2>
                  <button type="button" className="text-btn" onClick={() => ws.markNotificationsRead(null)}>Mark read</button>
                </header>
                {ws.notifications.length ? ws.notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cx("note", !item.read && "unread-note")}
                    onClick={() => {
                      ws.markNotificationsRead(item.id);
                      setNotesOpen(false);
                      ws.openResult({
                        channelId: item.channelId,
                        conversationId: item.conversationId,
                        messageId: item.messageId,
                        focusId: item.messageId,
                      });
                    }}
                  >
                    <span>{item.text}</span>
                    <span className="pin-meta">{formatTime(item.createdAt)}</span>
                  </button>
                )) : <p className="empty-copy">No notifications.</p>}
              </div>
            ) : null}
          </div>
          <IconButton label="Collapse sidebar" onClick={onCollapse}><PanelLeftClose size={16} /></IconButton>
        </div>
      </div>
      <button type="button" className="search-btn" onClick={() => ws.openSearch("")}>
        <Search size={14} />
        <span>Search Coding Hub...</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="nav-scroll">
        <div className="section-label">Spaces</div>
        {ws.categories.map((category) => (
          <SpaceSection
            key={category}
            label={category}
            action={category === ws.categories[0] && ws.can("manage_channels") ? (
              <IconButton label="Add channel" onClick={() => setChannelOpen(true)}><Plus size={14} /></IconButton>
            ) : null}
          >
            <ChannelList
              channels={ws.channels.filter((channel) => channel.category === category)}
              activeId={ws.active.type === "channel" ? ws.active.id : ""}
              onSelect={ws.selectChannel}
            />
          </SpaceSection>
        ))}
        <SpaceSection label="Direct messages">
          <DMList
            conversations={dms}
            users={ws.users}
            meId={ws.me.id}
            activeId={ws.active.type === "dm" ? ws.active.id : ""}
            onSelect={ws.selectConversation}
          />
        </SpaceSection>
        <SpaceSection label="Groups">
          <DMList
            conversations={groups}
            users={ws.users}
            meId={ws.me.id}
            activeId={ws.active.type === "dm" ? ws.active.id : ""}
            onSelect={ws.selectConversation}
          />
        </SpaceSection>
        <button type="button" className={cx("channel saved-link", ws.active.type === "saved" && "active")} onClick={ws.openSaved}>
          <Bookmark size={14} />
          <span className="channel-name">Saved</span>
          {ws.bookmarks.length ? <span className="unread muted-count">{ws.bookmarks.length}</span> : null}
        </button>
      </div>
      <div className="profile" ref={settingsRef}>
        <UserAvatar user={ws.me} size={28} presence />
        <span className="profile-copy">
          <span className="author">{ws.me.name}</span>
          <RoleBadge role={ws.me.role} roles={ws.roles} />
          <span className="sr">{ws.me.status === "online" ? "Online" : "Offline"}</span>
        </span>
        <IconButton
          label="Settings"
          pressed={settingsOpen}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <Settings size={16} />
        </IconButton>
        {settingsOpen ? (
          <div className="popover settings-pop" role="dialog" aria-label="Account settings">
            <header>
              <h2>Account</h2>
              <button type="button" className="icon-btn" aria-label="Close settings" onClick={() => setSettingsOpen(false)}><X size={14} /></button>
            </header>
            <p className="pin-meta">{ws.me.title}</p>
            <h3>Permissions</h3>
            <ul className="perm-list">
              {ws.me.permissions.map((permission) => <li key={permission}>{ws.me.permissionLabels[permission] || permission}</li>)}
            </ul>
            <h3>Switch account</h3>
            <ul className="account-list">
              {ws.users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className={user.id === ws.me.id ? "account active" : "account"}
                    onClick={() => { ws.switchUser(user.id); setSettingsOpen(false); }}
                  >
                    <UserAvatar user={user} size={20} />
                    <span>{user.name}</span>
                    <RoleBadge role={user.role} roles={ws.roles} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {channelOpen ? createPortal(
        <ChannelForm categories={ws.categories} onClose={() => setChannelOpen(false)} onCreate={ws.createChannel} />,
        document.body
      ) : null}
    </aside>
  );
}

function ChannelForm({ categories, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[1] || categories[0] || "General");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const fieldRef = useRef(null);
  useEffect(() => { fieldRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    try {
      await onCreate({ name, category, description });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="channel-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="modal-head">
          <h2 id="channel-title">New channel</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </header>
        <label className="field"><span>Name</span><input ref={fieldRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="upsolve" /></label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="field"><span>Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error ? <p className="error-line">{error}</p> : null}
        <footer className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="solid-btn">Create</button>
        </footer>
      </form>
    </div>
  );
}
