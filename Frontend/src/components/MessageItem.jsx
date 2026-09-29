import { MessageSquare } from "lucide-react";
import { cx, formatSize, formatTime } from "../lib/format";
import { AttachmentPreview } from "./AttachmentPreview";
import { MessageActions } from "./MessageActions";
import { PollMessage } from "./PollMessage";
import { ProblemCard } from "./ProblemCard";
import { ReactionBar } from "./ReactionBar";
import { RichText } from "./RichText";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";

function kindLabel(kind) {
  if (kind === "pdf") return "PDF";
  if (kind === "link") return "LINK";
  if (kind === "code") return "CODE";
  if (kind === "zip") return "ZIP";
  return "FILE";
}

export function MessageItem({
  message,
  author,
  roles,
  users,
  mentionRoles,
  meId,
  emojis,
  saved,
  canPin,
  canDelete,
  canReact,
  linked,
  idPrefix = "msg-",
  onReact,
  onReply,
  onSave,
  onPin,
  onDelete,
  onVote,
}) {
  if (message.deleted) {
    return (
      <article id={`${idPrefix}${message.id}`} className="msg deleted">
        <p>Message removed by a moderator</p>
      </article>
    );
  }

  const attachments = message.resource
    ? (message.attachments || []).filter((item) => item.url !== message.resource.url)
    : message.attachments || [];

  return (
    <article id={`${idPrefix}${message.id}`} className={cx("msg", linked && "linked")} aria-label={`Message from ${author?.name || "Unknown"}`}>
      <UserAvatar user={author} size={32} />
      <div className="msg-body">
        <header className="msg-top">
          <span className="author">{author?.name || "Unknown"}</span>
          {author ? <RoleBadge role={author.role} roles={roles} /> : null}
          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
        </header>
        {message.problem ? <ProblemCard problem={message.problem} /> : null}
        {message.resource ? (
          <div className="resource">
            <span className="file-badge">{kindLabel(message.resource.kind)}</span>
            <span className="resource-copy">
              <a href={message.resource.url} target="_blank" rel="noreferrer">{message.resource.title}</a>
              <span className="resource-meta">
                {[
                  message.resource.topic,
                  author ? `${message.resource.kind === "link" ? "Added" : "Uploaded"} by ${author.name.split(" ")[0]}` : null,
                  formatSize(message.resource.size),
                ].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="resource-actions">
              <a href={message.resource.url} target="_blank" rel="noreferrer">Open</a>
              <button type="button" onClick={onSave}>{saved ? "Saved" : "Save"}</button>
              {canPin ? <button type="button" onClick={onPin}>{message.isPinned ? "Unpin" : "Pin"}</button> : null}
            </span>
          </div>
        ) : null}
        {message.content ? (
          <div className="msg-text">
            <RichText text={message.content} users={users} mentionRoles={mentionRoles} />
          </div>
        ) : null}
        {message.poll ? <PollMessage poll={message.poll} onVote={(optionIds) => onVote(message.id, optionIds)} /> : null}
        {attachments.length ? (
          <div className="attach-list">
            {attachments.map((attachment) => <AttachmentPreview key={attachment.id || attachment.url} attachment={attachment} />)}
          </div>
        ) : null}
        <footer className="msg-foot">
          {canReact ? (
            <ReactionBar reactions={message.reactions} users={users} meId={meId} onToggle={(emoji) => onReact(message.id, emoji)} />
          ) : null}
          {message.replyCount > 0 ? (
            <button type="button" className="reply-count" onClick={onReply}>
              <MessageSquare size={13} />
              {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
            </button>
          ) : null}
        </footer>
      </div>
      <MessageActions
        emojis={emojis}
        saved={saved}
        canPin={canPin}
        canDelete={canDelete}
        pinned={message.isPinned}
        content={message.content || message.poll?.question || message.resource?.title || ""}
        onReact={(emoji) => onReact(message.id, emoji)}
        onReply={onReply}
        onSave={onSave}
        onPin={onPin}
        onDelete={() => onDelete(message.id)}
      />
    </article>
  );
}
