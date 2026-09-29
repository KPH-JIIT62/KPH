import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { IconButton } from "./IconButton";
import { MessageComposer } from "./MessageComposer";
import { ThreadMessage } from "./ThreadMessage";

export function ThreadPanel() {
  const {
    thread, users, roles, mentionRoles, reactionEmojis, me, can, active, threadFocus,
    closeThread, toggleReaction, toggleBookmark, togglePin, deleteMessage, vote, sendReply, isSaved,
  } = useWorkspace();
  const endRef = useRef(null);
  const allowProblem = active.type === "channel" && ["ch-problems", "ch-doubts"].includes(active.id);

  useEffect(() => {
    if (!threadFocus || !thread) return;
    document.getElementById(`thread-msg-${threadFocus}`)?.scrollIntoView({ block: "center" });
  }, [threadFocus, thread]);

  useEffect(() => {
    if (!threadFocus) endRef.current?.scrollIntoView();
  }, [thread?.replies.length, threadFocus]);

  if (!thread) {
    return (
      <aside className="thread" aria-label="Thread">
        <header className="thread-head"><h2>Thread</h2></header>
        <p className="empty-copy">That thread is unavailable.</p>
      </aside>
    );
  }

  function render(message, onReply) {
    const author = users.find((user) => user.id === message.authorId);
    return (
      <ThreadMessage
        message={message}
        author={author}
        roles={roles}
        users={users}
        mentionRoles={mentionRoles}
        meId={me.id}
        emojis={reactionEmojis}
        saved={isSaved(message.id)}
        canPin={can("pin_messages") && Boolean(message.channelId) && !message.parentId}
        canDelete={message.authorId === me.id || can("moderate_messages")}
        canReact={can("react")}
        onReact={toggleReaction}
        onReply={onReply}
        onSave={() => toggleBookmark(message.id)}
        onPin={() => togglePin(message)}
        onDelete={deleteMessage}
        onVote={vote}
      />
    );
  }

  return (
    <aside className="thread" aria-label="Thread">
      <header className="thread-head">
        <h2>Thread</h2>
        <IconButton label="Close thread" onClick={closeThread}><X size={16} /></IconButton>
      </header>
      <div className="thread-scroll">
        {render(thread.message, () => document.getElementById("thread-composer")?.focus())}
        <h3 className="thread-label">Replies</h3>
        {thread.replies.map((reply) => render(reply, () => document.getElementById("thread-composer")?.focus()))}
        <div ref={endRef} />
      </div>
      <MessageComposer
        inputId="thread-composer"
        placeholder="Reply to thread..."
        allowPoll={false}
        allowProblem={allowProblem}
        onSend={sendReply}
      />
    </aside>
  );
}
