import { useEffect, useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useMedia } from "../lib/useMedia";
import { cx } from "../lib/format";
import { ChannelHeader } from "./ChannelHeader";
import { DMConversation } from "./DMConversation";
import { GlobalSearch } from "./GlobalSearch";
import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";
import { SavedMessages } from "./SavedMessages";
import { Sidebar } from "./Sidebar";
import { ThreadPanel } from "./ThreadPanel";

export function CollaborationLayout() {
  const { status, bootError, reload, active, thread, channels, feedError, searchOpen, closeThread, openSearch, sendMessage } = useWorkspace();
  const mobile = useMedia("(max-width: 860px)");
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 860);

  useEffect(() => {
    setNavOpen(!mobile);
  }, [mobile]);

  useEffect(() => {
    function onKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch(active.type === "channel" ? active.id : "");
        return;
      }
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (searchOpen) return;
      if (thread && !(event.target instanceof HTMLTextAreaElement && event.target.value)) closeThread();
      else if (mobile && navOpen) setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, thread, mobile, navOpen, closeThread, openSearch, active]);

  if (status === "loading") {
    return <div className="boot">Loading workspace…</div>;
  }
  if (status === "error") {
    return (
      <div className="boot">
        <p>{bootError || "Coding Hub server is not reachable."}</p>
        <button type="button" className="solid-btn" onClick={reload}>Retry</button>
      </div>
    );
  }

  const channel = channels.find((item) => item.id === active.id);
  const showNavToggle = !navOpen || mobile;
  const allowProblem = active.type === "channel" && ["ch-problems", "ch-doubts"].includes(active.id);

  return (
    <>
      <a className="skip" href="#message-feed">Skip to messages</a>
      <div className={cx("app", navOpen && "nav-open", thread && "show-thread")}>
      <Sidebar onCollapse={() => setNavOpen(false)} />
      <main className="main" aria-label={channel ? channel.name : "Conversation"}>
        {feedError && active.type !== "saved" ? <p className="error-line feed-error">{feedError}</p> : null}
        {active.type === "saved" ? (
          <SavedMessages showNavToggle={showNavToggle} onToggleNav={() => setNavOpen(true)} />
        ) : active.type === "dm" ? (
          <DMConversation showNavToggle={showNavToggle} onToggleNav={() => setNavOpen(true)} />
        ) : (
          <>
            <ChannelHeader showNavToggle={showNavToggle} onToggleNav={() => setNavOpen(true)} />
            <MessageList />
            <MessageComposer
              placeholder={channel ? `Message #${channel.name}...` : "Message..."}
              allowProblem={allowProblem}
              resourceMode={channel?.name === "resources"}
              onSend={sendMessage}
            />
          </>
        )}
      </main>
      {thread ? <ThreadPanel /> : null}
      </div>
      {mobile && navOpen ? <button type="button" className="scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} /> : null}
      <GlobalSearch />
    </>
  );
}
