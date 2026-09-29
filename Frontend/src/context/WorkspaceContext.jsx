import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, currentUserId, setCurrentUserId, uploadFile } from "../api";
import { parseRoute, routeHash, sameList } from "../lib/format";

const WorkspaceContext = createContext(null);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace is not available");
  return value;
}

export function WorkspaceProvider({ children }) {
  const initial = parseRoute(window.location.hash);
  const [status, setStatus] = useState("loading");
  const [bootError, setBootError] = useState("");
  const [userId, setUserId] = useState(currentUserId);
  const [me, setMe] = useState(null);
  const [roles, setRoles] = useState([]);
  const [mentionRoles, setMentionRoles] = useState([]);
  const [reactionEmojis, setReactionEmojis] = useState(["👍", "💡", "🔥", "❤️"]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [active, setActive] = useState(initial.active);
  const [pendingThread, setPendingThread] = useState(initial.threadId);
  const [messages, setMessages] = useState([]);
  const [thread, setThread] = useState(null);
  const [feedError, setFeedError] = useState("");
  const [feedLoading, setFeedLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  const [highlight, setHighlight] = useState(null);
  const [threadFocus, setThreadFocus] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchChannel, setSearchChannel] = useState("");
  const [scrollNonce, setScrollNonce] = useState(0);
  const activeRef = useRef(active);
  const threadRef = useRef(pendingThread);
  activeRef.current = active;
  threadRef.current = pendingThread;

  const activeKey = `${active.type}:${active.id}`;

  const applyRoute = useCallback(() => {
    const route = parseRoute(window.location.hash);
    setActive((current) => (current.type === route.active.type && current.id === route.active.id ? current : route.active));
    setPendingThread((current) => (current === route.threadId ? current : route.threadId));
  }, []);

  useEffect(() => {
    if (!window.location.hash) window.location.replace("#/c/ch-problems");
    window.addEventListener("hashchange", applyRoute);
    return () => window.removeEventListener("hashchange", applyRoute);
  }, [applyRoute]);

  useEffect(() => {
    let cancel = false;
    setStatus("loading");
    setBootError("");
    api("/api/bootstrap")
      .then((data) => {
        if (cancel) return;
        setMe(data.me);
        setRoles(data.roles);
        setMentionRoles(data.mentionRoles);
        setReactionEmojis(data.reactionEmojis);
        setCategories(data.categories);
        setUsers(data.users);
        setChannels(data.channels);
        setConversations(data.conversations);
        setBookmarks(data.bookmarks);
        setNotifications(data.notifications);
        setStatus("ready");
      })
      .catch((error) => {
        if (!cancel) {
          setStatus("error");
          setBootError(error.message);
        }
      });
    return () => {
      cancel = true;
    };
  }, [userId, retryToken]);

  useEffect(() => {
    if (status !== "ready" || active.type === "saved") return undefined;
    let cancel = false;
    const current = active;
    setFeedLoading(true);
    (async () => {
      try {
        const path = current.type === "channel"
          ? `/api/channels/${current.id}/messages`
          : `/api/conversations/${current.id}/messages`;
        const data = await api(path);
        if (cancel) return;
        setMessages(data.messages);
        setFeedError("");
        const readPath = current.type === "channel"
          ? `/api/channels/${current.id}/read`
          : `/api/conversations/${current.id}/read`;
        await api(readPath, { method: "POST" });
        if (cancel) return;
        if (current.type === "channel") {
          setChannels((list) => list.map((channel) => (channel.id === current.id ? { ...channel, unread: 0 } : channel)));
          setNotifications((list) => list.map((item) => (item.channelId === current.id ? { ...item, read: true } : item)));
        } else {
          setConversations((list) => list.map((conversation) => (
            conversation.id === current.id ? { ...conversation, unread: 0 } : conversation
          )));
        }
      } catch (error) {
        if (!cancel) setFeedError(error.message);
      } finally {
        if (!cancel) setFeedLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [status, activeKey, userId, active]);

  useEffect(() => {
    if (status !== "ready" || !pendingThread) {
      setThread(null);
      return undefined;
    }
    let cancel = false;
    api(`/api/messages/${pendingThread}`)
      .then((data) => {
        if (!cancel) setThread(data);
      })
      .catch(() => {
        if (!cancel) setThread(null);
      });
    return () => {
      cancel = true;
    };
  }, [status, pendingThread, userId]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      const current = activeRef.current;
      try {
        const inbox = await api("/api/inbox");
        setChannels((list) => list.map((channel) => ({
          ...channel,
          unread: current.type === "channel" && channel.id === current.id
            ? 0
            : inbox.channels.find((item) => item.id === channel.id)?.unread ?? channel.unread,
        })));
        setConversations((list) => list.map((conversation) => ({
          ...conversation,
          unread: current.type === "dm" && conversation.id === current.id
            ? 0
            : inbox.conversations.find((item) => item.id === conversation.id)?.unread ?? conversation.unread,
        })));
        setNotifications(inbox.notifications);
        if (current.type === "saved") return;
        const path = current.type === "channel"
          ? `/api/channels/${current.id}/messages`
          : `/api/conversations/${current.id}/messages`;
        const data = await api(path);
        setMessages((previous) => (sameList(previous, data.messages) ? previous : data.messages));
        if (threadRef.current) {
          const nextThread = await api(`/api/messages/${threadRef.current}`);
          setThread((previous) => (previous && previous.message.id === nextThread.message.id ? nextThread : previous));
        }
      } catch {
        // A failed poll should leave the open conversation in place.
      }
    }, 12000);
    return () => clearInterval(timer);
  }, [status, userId]);

  const go = useCallback((next, threadId = null) => {
    const hash = routeHash(next, threadId);
    if (window.location.hash !== hash) window.location.hash = hash;
  }, []);

  const replaceMessage = useCallback((message) => {
    setMessages((list) => list.map((item) => (item.id === message.id ? message : item)));
    setThread((current) => {
      if (!current) return current;
      if (current.message.id === message.id) return { ...current, message };
      return { ...current, replies: current.replies.map((item) => (item.id === message.id ? message : item)) };
    });
  }, []);

  const userById = useCallback((id) => users.find((user) => user.id === id) || null, [users]);
  const can = useCallback((permission) => Boolean(me?.permissions?.includes(permission)), [me]);

  const openSearch = useCallback((channelId = "") => {
    setSearchChannel(channelId);
    setSearchOpen(true);
  }, []);

  const openResult = useCallback((result) => {
    const next = result.conversationId
      ? { type: "dm", id: result.conversationId }
      : { type: "channel", id: result.channelId };
    setHighlight(result.parentId ? result.messageId : result.focusId || result.messageId);
    setThreadFocus(result.parentId ? result.focusId : null);
    setSearchOpen(false);
    go(next, result.parentId ? result.messageId : null);
  }, [go]);

  const value = useMemo(() => ({
    status,
    bootError,
    me,
    roles,
    mentionRoles,
    reactionEmojis,
    categories,
    users,
    channels,
    conversations,
    bookmarks,
    notifications,
    active,
    messages,
    thread,
    feedError,
    feedLoading,
    highlight,
    threadFocus,
    searchOpen,
    searchChannel,
    scrollNonce,
    userById,
    can,
    reload() {
      setRetryToken((token) => token + 1);
    },
    switchUser(id) {
      setCurrentUserId(id);
      setUserId(id);
      setThread(null);
      setMessages([]);
    },
    selectChannel(id) {
      setHighlight(null);
      setThreadFocus(null);
      go({ type: "channel", id });
    },
    selectConversation(id) {
      setHighlight(null);
      setThreadFocus(null);
      go({ type: "dm", id });
    },
    openSaved() {
      setHighlight(null);
      go({ type: "saved", id: "saved" });
    },
    openThread(messageId) {
      setThreadFocus(null);
      go(activeRef.current, messageId);
    },
    closeThread() {
      setThreadFocus(null);
      go(activeRef.current, null);
    },
    openSearch,
    closeSearch() {
      setSearchOpen(false);
    },
    openResult,
    openBookmark(bookmark) {
      const message = bookmark.message;
      openResult({
        channelId: message.channelId,
        conversationId: message.conversationId,
        messageId: message.parentId || message.id,
        parentId: message.parentId,
        focusId: message.id,
      });
    },
    async sendMessage(payload) {
      const current = activeRef.current;
      const path = current.type === "channel"
        ? `/api/channels/${current.id}/messages`
        : `/api/conversations/${current.id}/messages`;
      const data = await api(path, { method: "POST", body: payload });
      setMessages((list) => [...list, data.message]);
      setScrollNonce((nonce) => nonce + 1);
      return data.message;
    },
    async sendReply(payload) {
      if (!threadRef.current) return null;
      const data = await api(`/api/messages/${threadRef.current}/replies`, { method: "POST", body: payload });
      replaceMessage(data.parent);
      setThread((current) => (current ? { message: data.parent, replies: [...current.replies, data.reply] } : current));
      return data.reply;
    },
    async toggleReaction(messageId, emoji) {
      const data = await api(`/api/messages/${messageId}/reactions`, { method: "POST", body: { emoji } });
      replaceMessage(data.message);
    },
    async vote(messageId, optionIds) {
      const data = await api(`/api/messages/${messageId}/vote`, { method: "POST", body: { optionIds } });
      replaceMessage(data.message);
    },
    async togglePin(message) {
      const data = await api(`/api/messages/${message.id}/pin`, { method: "POST", body: { pinned: !message.isPinned } });
      replaceMessage(data.message);
    },
    async deleteMessage(messageId) {
      const data = await api(`/api/messages/${messageId}`, { method: "DELETE" });
      replaceMessage(data.message);
    },
    async toggleBookmark(messageId) {
      const exists = bookmarks.some((bookmark) => bookmark.messageId === messageId);
      const data = exists
        ? await api(`/api/bookmarks/${messageId}`, { method: "DELETE" })
        : await api("/api/bookmarks", { method: "POST", body: { messageId } });
      setBookmarks(data.bookmarks);
    },
    async openDirect(otherId) {
      const data = await api("/api/conversations", { method: "POST", body: { userId: otherId } });
      setConversations((list) => (list.some((item) => item.id === data.conversation.id) ? list : [data.conversation, ...list]));
      go({ type: "dm", id: data.conversation.id });
      return data.conversation;
    },
    async createChannel(body) {
      const data = await api("/api/channels", { method: "POST", body });
      setChannels((list) => [...list, data.channel]);
      setCategories((list) => (list.includes(data.channel.category) ? list : [...list, data.channel.category]));
      go({ type: "channel", id: data.channel.id });
      return data.channel;
    },
    async markNotificationsRead(id) {
      const data = await api("/api/notifications/read", { method: "POST", body: { id: id || null } });
      setNotifications(data.notifications);
    },
    uploadFile,
    isSaved(messageId) {
      return bookmarks.some((bookmark) => bookmark.messageId === messageId);
    },
  }), [
    status, bootError, me, roles, mentionRoles, reactionEmojis, categories, users, channels,
    conversations, bookmarks, notifications, active, messages, thread, feedError, feedLoading, highlight,
    threadFocus, searchOpen, searchChannel, scrollNonce, userById, can, go, openSearch, openResult, replaceMessage,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
