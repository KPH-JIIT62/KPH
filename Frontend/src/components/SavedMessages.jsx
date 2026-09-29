import { BookmarkX, Menu } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatDay, previewText } from "../lib/format";
import { IconButton } from "./IconButton";

export function SavedMessages({ showNavToggle, onToggleNav }) {
  const { bookmarks, channels, users, openBookmark, toggleBookmark } = useWorkspace();
  return (
    <>
      <header className="header">
        <div className="header-id">
          {showNavToggle ? <IconButton label="Open sidebar" onClick={onToggleNav}><Menu size={16} /></IconButton> : null}
          <div>
            <h1>Saved</h1>
            <p className="header-topic">Messages you bookmarked</p>
          </div>
        </div>
      </header>
      <div className="feed saved-feed">
        {bookmarks.length ? bookmarks.map((bookmark) => {
          const channel = channels.find((item) => item.id === bookmark.message?.channelId);
          const author = users.find((user) => user.id === bookmark.message?.authorId);
          return (
            <article key={bookmark.id} className="saved-item">
              <button type="button" className="saved-open" onClick={() => openBookmark(bookmark)}>
                <span className="pin-preview">{previewText(bookmark.message)}</span>
                <span className="pin-meta">
                  {author?.name || "Unknown"}
                  {channel ? ` · #${channel.name}` : ""}
                  {` · Saved ${formatDay(bookmark.savedAt)}`}
                </span>
              </button>
              <button type="button" className="icon-btn" aria-label="Remove bookmark" onClick={() => toggleBookmark(bookmark.messageId)}>
                <BookmarkX size={15} />
              </button>
            </article>
          );
        }) : <p className="empty-copy">No saved messages yet. Hover a message and choose Save.</p>}
      </div>
    </>
  );
}
