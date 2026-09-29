import { useEffect, useRef } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { MessageItem } from "./MessageItem";

export function MessageList({ idPrefix = "msg-" }) {
  const {
    messages, me, users, roles, mentionRoles, reactionEmojis, thread, highlight, active, feedLoading,
    scrollNonce, can, isSaved, toggleReaction, openThread, toggleBookmark, togglePin, deleteMessage, vote,
  } = useWorkspace();
  const endRef = useRef(null);
  const landed = useRef("");
  const visible = messages.filter((message) => (
    active.type === "channel" ? message.channelId === active.id : message.conversationId === active.id
  ));

  useEffect(() => {
    if (highlight || !visible.length) return;
    if (landed.current === active.id) return;
    landed.current = active.id;
    endRef.current?.scrollIntoView();
  }, [active.id, highlight, visible]);

  useEffect(() => {
    if (!scrollNonce || highlight) return;
    endRef.current?.scrollIntoView();
  }, [scrollNonce, highlight]);

  useEffect(() => {
    if (!highlight) return undefined;
    const node = document.getElementById(`${idPrefix}${highlight}`);
    if (!node) return undefined;
    node.scrollIntoView({ block: "center" });
    node.classList.add("flash");
    const timer = window.setTimeout(() => node.classList.remove("flash"), 1400);
    return () => window.clearTimeout(timer);
  }, [highlight, idPrefix, messages]);

  if (!visible.length) {
    return <div className="feed empty-feed">{feedLoading ? "" : "No messages yet."}</div>;
  }

  return (
    <div className="feed" id="message-feed" aria-live="polite">
      {visible.map((message) => {
        const author = users.find((user) => user.id === message.authorId);
        return (
          <MessageItem
            key={message.id}
            message={message}
            author={author}
            roles={roles}
            users={users}
            mentionRoles={mentionRoles}
            meId={me.id}
            emojis={reactionEmojis}
            saved={isSaved(message.id)}
            canPin={can("pin_messages") && active.type === "channel"}
            canDelete={message.authorId === me.id || can("moderate_messages")}
            canReact={can("react")}
            linked={thread?.message.id === message.id}
            idPrefix={idPrefix}
            onReact={toggleReaction}
            onReply={() => openThread(message.id)}
            onSave={() => toggleBookmark(message.id)}
            onPin={() => togglePin(message)}
            onDelete={deleteMessage}
            onVote={vote}
          />
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
