const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { HttpError } = require("./errors");
const {
  PERMISSIONS,
  ROLES,
  ROLE_MENTIONS,
  REACTION_EMOJIS,
  PERMISSION_LABELS,
  permissionsFor,
  can,
} = require("./permissions");
const { buildSeed } = require("./seed");
const { ensureAssets } = require("./files");

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function byTime(a, b) {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    role: user.role,
    status: user.status,
    title: user.title,
    color: user.color,
  };
}

function openStore({ dataFile, uploadsDir }) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  ensureAssets(uploadsDir);

  let db = null;
  if (fs.existsSync(dataFile)) {
    try {
      db = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch (error) {
      db = null;
    }
  }
  if (!db || !db.users || !db.messages) {
    db = buildSeed(uploadsDir);
    persist();
  }

  function persist() {
    const json = JSON.stringify(db, null, 2);
    const tmp = `${dataFile}.tmp`;
    fs.writeFileSync(tmp, json);
    fs.copyFileSync(tmp, dataFile);
    fs.unlinkSync(tmp);
  }

  function replyCount(id) {
    return db.messages.filter((message) => message.parentId === id && !message.deleted).length;
  }

  function serialize(message, userId) {
    const shared = {
      id: message.id,
      channelId: message.channelId,
      conversationId: message.conversationId,
      parentId: message.parentId,
      authorId: message.authorId,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      deleted: Boolean(message.deleted),
      isPinned: Boolean(message.isPinned) && !message.deleted,
      replyCount: replyCount(message.id),
    };
    if (message.deleted) {
      return { ...shared, content: "", attachments: [], reactions: [], poll: null, problem: null, resource: null };
    }
    const poll = message.poll
      ? {
          question: message.poll.question,
          allowMultiple: message.poll.allowMultiple,
          totalVoters: new Set(message.poll.options.flatMap((option) => option.voterIds)).size,
          options: message.poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            count: option.voterIds.length,
            mine: option.voterIds.includes(userId),
          })),
        }
      : null;
    return {
      ...shared,
      content: message.content,
      attachments: message.attachments,
      reactions: message.reactions,
      poll,
      problem: message.problem,
      resource: message.resource,
    };
  }

  function getUser(id) {
    return db.users.find((user) => user.id === id) || null;
  }

  function mustUser(id) {
    const user = getUser(id);
    if (!user) throw new HttpError(401, "Unknown user");
    return user;
  }

  function channelById(id) {
    return db.channels.find((channel) => channel.id === id) || null;
  }

  function conversationById(id) {
    return db.conversations.find((conversation) => conversation.id === id) || null;
  }

  function mustMessage(id) {
    const message = db.messages.find((item) => item.id === id);
    if (!message) throw new HttpError(404, "Message not found");
    return message;
  }

  function assertMember(user, conversation) {
    if (!conversation.participantIds.includes(user.id)) {
      throw new HttpError(403, "You are not in this conversation");
    }
  }

  function assertVisible(user, message) {
    if (!message.conversationId) return;
    const conversation = conversationById(message.conversationId);
    if (!conversation) throw new HttpError(404, "Conversation not found");
    assertMember(user, conversation);
  }

  function assertCan(user, permission) {
    if (!can(user, permission)) throw new HttpError(403, "You don't have permission to do that");
  }

  function cursor(userId, bucket, id) {
    return db.reads[userId]?.[bucket]?.[id] || "1970-01-01T00:00:00.000Z";
  }

  function ensureRead(userId) {
    if (!db.reads[userId]) db.reads[userId] = { channels: {}, conversations: {} };
    if (!db.reads[userId].channels) db.reads[userId].channels = {};
    if (!db.reads[userId].conversations) db.reads[userId].conversations = {};
  }

  function unreadChannel(userId, channelId) {
    const since = cursor(userId, "channels", channelId);
    return db.messages.filter(
      (message) =>
        message.channelId === channelId &&
        !message.parentId &&
        !message.deleted &&
        message.authorId !== userId &&
        message.createdAt > since
    ).length;
  }

  function unreadConversation(userId, conversationId) {
    const since = cursor(userId, "conversations", conversationId);
    return db.messages.filter(
      (message) =>
        message.conversationId === conversationId &&
        !message.parentId &&
        !message.deleted &&
        message.authorId !== userId &&
        message.createdAt > since
    ).length;
  }

  function visibleConversations(userId) {
    return db.conversations
      .filter((conversation) => conversation.participantIds.includes(userId))
      .map((conversation) => ({
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        participantIds: conversation.participantIds,
        memberCount: conversation.participantIds.length,
        unread: unreadConversation(userId, conversation.id),
      }));
  }

  function mePayload(user) {
    const permissions = permissionsFor(user.role);
    return {
      ...publicUser(user),
      permissions,
      permissionLabels: Object.fromEntries(permissions.map((key) => [key, PERMISSION_LABELS[key] || key])),
    };
  }

  function listNotifications(userId) {
    return db.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 30);
  }

  function bootstrap(userId) {
    const user = mustUser(userId);
    return {
      me: mePayload(user),
      roles: ROLES,
      mentionRoles: ROLE_MENTIONS,
      reactionEmojis: REACTION_EMOJIS,
      categories: db.categories,
      users: db.users.map(publicUser),
      channels: db.channels.map((channel) => ({ ...channel, unread: unreadChannel(userId, channel.id) })),
      conversations: visibleConversations(userId),
      bookmarks: listBookmarks(userId),
      notifications: listNotifications(userId),
    };
  }

  function inbox(userId) {
    mustUser(userId);
    return {
      channels: db.channels.map((channel) => ({ id: channel.id, unread: unreadChannel(userId, channel.id) })),
      conversations: visibleConversations(userId).map((conversation) => ({
        id: conversation.id,
        unread: conversation.unread,
      })),
      notifications: listNotifications(userId),
    };
  }

  function channelMessages(userId, channelId) {
    mustUser(userId);
    if (!channelById(channelId)) throw new HttpError(404, "Channel not found");
    return db.messages
      .filter((message) => message.channelId === channelId && !message.parentId)
      .sort(byTime)
      .map((message) => serialize(message, userId));
  }

  function conversationMessages(user, conversationId) {
    const conversation = conversationById(conversationId);
    if (!conversation) throw new HttpError(404, "Conversation not found");
    assertMember(user, conversation);
    return db.messages
      .filter((message) => message.conversationId === conversationId && !message.parentId)
      .sort(byTime)
      .map((message) => serialize(message, user.id));
  }

  function getThread(user, messageId) {
    const message = mustMessage(messageId);
    assertVisible(user, message);
    const replies = db.messages.filter((item) => item.parentId === messageId).sort(byTime);
    return {
      message: serialize(message, user.id),
      replies: replies.map((reply) => serialize(reply, user.id)),
    };
  }

  function cleanAttachments(list) {
    if (!list || !list.length) return [];
    if (!Array.isArray(list)) throw new HttpError(400, "Invalid attachments");
    return list.slice(0, 6).map((attachment) => {
      if (attachment.kind === "link") {
        const url = String(attachment.url || "").trim();
        if (!/^https?:\/\//i.test(url)) throw new HttpError(400, "Link must be an http(s) URL");
        return {
          id: uid("a"),
          name: String(attachment.name || url).slice(0, 140),
          mime: "text/uri-list",
          size: 0,
          url,
          kind: "link",
        };
      }
      const url = String(attachment.url || "");
      if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(url)) throw new HttpError(400, "Invalid attachment");
      return {
        id: attachment.id || uid("a"),
        name: String(attachment.name || "file").slice(0, 160),
        mime: String(attachment.mime || "application/octet-stream").slice(0, 80),
        size: Number(attachment.size) || 0,
        url,
        kind: ["pdf", "image", "zip", "code", "file"].includes(attachment.kind) ? attachment.kind : "file",
      };
    });
  }

  function cleanProblem(problem) {
    if (!problem) return null;
    const platform = String(problem.platform || "").trim().slice(0, 40);
    const id = String(problem.id || "").trim().slice(0, 32);
    const title = String(problem.title || "").trim().slice(0, 140);
    if (!platform || !id || !title) throw new HttpError(400, "Problem card needs a platform, id, and title");
    const url = problem.url ? String(problem.url).trim() : "";
    if (url && !/^https?:\/\//i.test(url)) throw new HttpError(400, "Problem link must be an http(s) URL");
    return {
      platform,
      id,
      title,
      difficulty: String(problem.difficulty || "").trim().slice(0, 24),
      topic: String(problem.topic || "").trim().slice(0, 48),
      url: url || null,
    };
  }

  function cleanResource(resource) {
    if (!resource) return null;
    const title = String(resource.title || "").trim().slice(0, 140);
    const url = String(resource.url || "").trim();
    const kind = resource.kind === "link" ? "link" : resource.kind === "pdf" ? "pdf" : "file";
    if (!title || !url) throw new HttpError(400, "Resource needs a title and a link");
    if (kind === "link" && !/^https?:\/\//i.test(url)) throw new HttpError(400, "Resource link must be an http(s) URL");
    if (kind !== "link" && !/^\/uploads\/[A-Za-z0-9._-]+$/.test(url) && !/^https?:\/\//i.test(url)) {
      throw new HttpError(400, "Invalid resource file");
    }
    return {
      kind,
      title,
      topic: String(resource.topic || "").trim().slice(0, 48),
      size: Number(resource.size) || 0,
      url,
    };
  }

  function cleanPoll(poll) {
    if (!poll) return null;
    const question = String(poll.question || "").trim().slice(0, 200);
    const options = (Array.isArray(poll.options) ? poll.options : [])
      .map((option) => String(option).trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 8);
    if (!question) throw new HttpError(400, "Poll question is required");
    if (options.length < 2) throw new HttpError(400, "A poll needs at least two options");
    return {
      question,
      allowMultiple: Boolean(poll.allowMultiple),
      options: options.map((text) => ({ id: uid("o"), text, voterIds: [] })),
    };
  }

  function findMentions(content) {
    const userHits = [];
    const roleHits = [];
    const seenUsers = new Set();
    const seenRoles = new Set();
    const matcher = /@([a-z0-9]+)/gi;
    let match = matcher.exec(content);
    while (match) {
      const token = match[1].toLowerCase();
      const mentioned = db.users.find((user) => user.handle === token);
      if (mentioned && !seenUsers.has(mentioned.id)) {
        seenUsers.add(mentioned.id);
        userHits.push(mentioned);
      }
      const role = ROLE_MENTIONS.find((item) => item.token === token);
      if (role && !seenRoles.has(role.role)) {
        seenRoles.add(role.role);
        roleHits.push(role);
      }
      match = matcher.exec(content);
    }
    return { userHits, roleHits };
  }

  function placeLabel(channelId, conversationId) {
    if (channelId) {
      const channel = channelById(channelId);
      return channel ? `#${channel.name}` : "a channel";
    }
    const conversation = conversationById(conversationId);
    if (!conversation) return "a conversation";
    if (conversation.type === "group") return conversation.name;
    return "a direct message";
  }

  function notifyMentions(author, message) {
    const { userHits, roleHits } = findMentions(message.content);
    if (roleHits.length && !can(author, PERMISSIONS.ROLE_MENTION)) {
      throw new HttpError(403, "You can't mention a role");
    }
    const recipients = new Map();
    for (const mentioned of userHits) {
      if (mentioned.id !== author.id) recipients.set(mentioned.id, mentioned);
    }
    for (const role of roleHits) {
      for (const mentioned of db.users.filter((user) => user.role === role.role)) {
        if (mentioned.id !== author.id) recipients.set(mentioned.id, mentioned);
      }
    }
    const where = placeLabel(message.channelId, message.conversationId);
    for (const mentioned of recipients.values()) {
      db.notifications.unshift({
        id: uid("n"),
        userId: mentioned.id,
        actorId: author.id,
        messageId: message.parentId || message.id,
        channelId: message.channelId,
        conversationId: message.conversationId,
        kind: "mention",
        text: `${author.name} mentioned you in ${where}`,
        createdAt: message.createdAt,
        read: false,
      });
    }
    if (db.notifications.length > 400) db.notifications.length = 400;
  }

  function addMessage(user, fields) {
    const content = String(fields.content || "").replace(/\r\n/g, "\n").slice(0, 4000);
    const attachments = cleanAttachments(fields.attachments);
    const problem = cleanProblem(fields.problem);
    const resource = cleanResource(fields.resource);
    const poll = cleanPoll(fields.poll);
    if (poll) assertCan(user, PERMISSIONS.CREATE_POLLS);
    if (!content.trim() && !attachments.length && !poll && !resource && !problem) {
      throw new HttpError(400, "Message is empty");
    }

    const message = {
      id: uid("m"),
      channelId: fields.channelId || null,
      conversationId: fields.conversationId || null,
      parentId: fields.parentId || null,
      authorId: user.id,
      content,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deleted: false,
      isPinned: false,
      attachments,
      reactions: [],
      poll,
      problem,
      resource,
    };
    notifyMentions(user, message);
    db.messages.push(message);
    persist();
    return serialize(message, user.id);
  }

  function createChannelMessage(userId, channelId, body) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.SEND_MESSAGES);
    if (!channelById(channelId)) throw new HttpError(404, "Channel not found");
    return addMessage(user, { ...body, channelId, conversationId: null, parentId: null });
  }

  function createConversationMessage(userId, conversationId, body) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.SEND_DMS);
    const conversation = conversationById(conversationId);
    if (!conversation) throw new HttpError(404, "Conversation not found");
    assertMember(user, conversation);
    return addMessage(user, { ...body, conversationId, channelId: null, parentId: null });
  }

  function createReply(userId, parentId, body) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.CREATE_THREADS);
    const parent = mustMessage(parentId);
    if (parent.parentId) throw new HttpError(400, "Replies stay in the original thread");
    if (parent.deleted) throw new HttpError(400, "That message was removed");
    assertVisible(user, parent);
    if (parent.conversationId) assertCan(user, PERMISSIONS.SEND_DMS);
    else assertCan(user, PERMISSIONS.SEND_MESSAGES);
    const reply = addMessage(user, {
      ...body,
      channelId: parent.channelId,
      conversationId: parent.conversationId,
      parentId: parent.id,
      poll: null,
    });
    return { reply, parent: serialize(parent, user.id) };
  }

  function toggleReaction(userId, messageId, emoji) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.REACT);
    if (!REACTION_EMOJIS.includes(emoji)) throw new HttpError(400, "Unknown reaction");
    const message = mustMessage(messageId);
    if (message.deleted) throw new HttpError(400, "That message was removed");
    assertVisible(user, message);
    let bucket = message.reactions.find((reaction) => reaction.emoji === emoji);
    if (!bucket) {
      bucket = { emoji, userIds: [] };
      message.reactions.push(bucket);
    }
    if (bucket.userIds.includes(user.id)) bucket.userIds = bucket.userIds.filter((id) => id !== user.id);
    else bucket.userIds.push(user.id);
    message.reactions = message.reactions.filter((reaction) => reaction.userIds.length > 0);
    persist();
    return serialize(message, user.id);
  }

  function vote(userId, messageId, optionIds) {
    const user = mustUser(userId);
    const message = mustMessage(messageId);
    if (!message.poll || message.deleted) throw new HttpError(400, "This message is not a poll");
    assertVisible(user, message);
    const ids = [...new Set(Array.isArray(optionIds) ? optionIds : [])];
    if (!ids.length) throw new HttpError(400, "Choose an option");
    if (!message.poll.allowMultiple && ids.length > 1) throw new HttpError(400, "This poll allows one answer");
    const known = new Set(message.poll.options.map((option) => option.id));
    if (ids.some((id) => !known.has(id))) throw new HttpError(400, "Unknown poll option");
    for (const option of message.poll.options) {
      option.voterIds = option.voterIds.filter((id) => id !== user.id);
      if (ids.includes(option.id)) option.voterIds.push(user.id);
    }
    persist();
    return serialize(message, user.id);
  }

  function setPin(userId, messageId, pinned) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.PIN_MESSAGES);
    const message = mustMessage(messageId);
    if (message.deleted) throw new HttpError(400, "That message was removed");
    if (!message.channelId || message.parentId) throw new HttpError(400, "Only channel messages can be pinned");
    message.isPinned = Boolean(pinned);
    persist();
    return serialize(message, user.id);
  }

  function deleteMessage(userId, messageId) {
    const user = mustUser(userId);
    const message = mustMessage(messageId);
    assertVisible(user, message);
    if (message.authorId !== user.id) assertCan(user, PERMISSIONS.MODERATE_MESSAGES);
    message.deleted = true;
    message.content = "";
    message.attachments = [];
    message.reactions = [];
    message.poll = null;
    message.problem = null;
    message.resource = null;
    message.isPinned = false;
    persist();
    return serialize(message, user.id);
  }

  function markChannelRead(userId, channelId) {
    mustUser(userId);
    if (!channelById(channelId)) throw new HttpError(404, "Channel not found");
    ensureRead(userId);
    const now = new Date().toISOString();
    db.reads[userId].channels[channelId] = now;
    for (const notification of db.notifications) {
      if (notification.userId === userId && notification.channelId === channelId) notification.read = true;
    }
    persist();
    return { id: channelId, unread: 0 };
  }

  function markConversationRead(userId, conversationId) {
    const user = mustUser(userId);
    const conversation = conversationById(conversationId);
    if (!conversation) throw new HttpError(404, "Conversation not found");
    assertMember(user, conversation);
    ensureRead(userId);
    db.reads[userId].conversations[conversationId] = new Date().toISOString();
    for (const notification of db.notifications) {
      if (notification.userId === userId && notification.conversationId === conversationId) notification.read = true;
    }
    persist();
    return { id: conversationId, unread: 0 };
  }

  function markNotificationsRead(userId, notificationId) {
    mustUser(userId);
    for (const notification of db.notifications) {
      if (notification.userId !== userId) continue;
      if (!notificationId || notification.id === notificationId) notification.read = true;
    }
    persist();
    return listNotifications(userId);
  }

  function listBookmarks(userId) {
    mustUser(userId);
    return db.bookmarks
      .filter((bookmark) => bookmark.userId === userId)
      .map((bookmark) => {
        const message = db.messages.find((item) => item.id === bookmark.messageId);
        return { ...bookmark, message: message ? serialize(message, userId) : null };
      })
      .filter((bookmark) => bookmark.message && !bookmark.message.deleted)
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }

  function addBookmark(userId, messageId) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.SAVE_MESSAGES);
    const message = mustMessage(messageId);
    if (message.deleted) throw new HttpError(400, "That message was removed");
    assertVisible(user, message);
    const targetId = message.parentId || message.id;
    const existing = db.bookmarks.find((bookmark) => bookmark.userId === userId && bookmark.messageId === targetId);
    if (existing) return listBookmarks(userId);
    db.bookmarks.unshift({
      id: uid("b"),
      userId,
      messageId: targetId,
      savedAt: new Date().toISOString(),
    });
    persist();
    return listBookmarks(userId);
  }

  function removeBookmark(userId, messageId) {
    mustUser(userId);
    db.bookmarks = db.bookmarks.filter((bookmark) => !(bookmark.userId === userId && bookmark.messageId === messageId));
    persist();
    return listBookmarks(userId);
  }

  function snippet(text, query) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!query) return clean.slice(0, 140);
    const hay = clean.toLowerCase();
    const needle = query.toLowerCase();
    const at = hay.indexOf(needle);
    if (at < 0) return clean.slice(0, 140);
    const start = Math.max(0, at - 42);
    const end = Math.min(clean.length, at + needle.length + 72);
    return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
  }

  function search(userId, params) {
    const user = mustUser(userId);
    const q = String(params.q || "").trim().toLowerCase();
    const from = params.from || "";
    const channel = params.channel || "";
    const before = params.before || "";
    const after = params.after || "";
    const hasFile = params.hasFile === "1" || params.hasFile === "true";
    if (!q && !from && !channel && !before && !after && !hasFile) {
      return { messages: [], files: [], people: [], channels: [] };
    }

    const afterIso = after ? startOfDay(after) : null;
    const beforeIso = before ? endOfDay(before) : null;
    const matchesQuery = (text) => !q || String(text || "").toLowerCase().includes(q);

    const messages = [];
    const files = [];
    for (const message of db.messages) {
      if (message.deleted) continue;
      if (message.conversationId) {
        const conversation = conversationById(message.conversationId);
        if (!conversation || !conversation.participantIds.includes(user.id)) continue;
      }
      if (from && message.authorId !== from) continue;
      if (channel && message.channelId !== channel) continue;
      if (afterIso && message.createdAt < afterIso) continue;
      if (beforeIso && message.createdAt > beforeIso) continue;
      const attachmentHits = [
        ...(message.attachments || []),
        ...(message.resource && message.resource.kind !== "link"
          ? [{ name: message.resource.title, url: message.resource.url, kind: message.resource.kind }]
          : []),
      ];
      if (hasFile && attachmentHits.length === 0) continue;

      const text = [
        message.content,
        message.problem?.title,
        message.problem?.id,
        message.poll?.question,
        message.resource?.title,
        message.resource?.topic,
      ]
        .filter(Boolean)
        .join(" ");
      if (matchesQuery(text)) {
        messages.push({
          messageId: message.parentId || message.id,
          focusId: message.id,
          parentId: message.parentId,
          channelId: message.channelId,
          conversationId: message.conversationId,
          authorId: message.authorId,
          createdAt: message.createdAt,
          snippet: snippet(message.poll?.question || text, q),
        });
      }
      for (const file of attachmentHits) {
        if (!matchesQuery(`${file.name} ${text}`)) continue;
        files.push({
          messageId: message.parentId || message.id,
          focusId: message.id,
          channelId: message.channelId,
          conversationId: message.conversationId,
          authorId: message.authorId,
          createdAt: message.createdAt,
          name: file.name,
          url: file.url,
          kind: file.kind,
        });
      }
      if (message.resource?.kind === "link" && matchesQuery(`${message.resource.title} ${message.resource.topic}`)) {
        files.push({
          messageId: message.id,
          focusId: message.id,
          channelId: message.channelId,
          conversationId: null,
          authorId: message.authorId,
          createdAt: message.createdAt,
          name: message.resource.title,
          url: message.resource.url,
          kind: "link",
        });
      }
    }

    const people = !from && !channel && !hasFile
      ? db.users
          .filter((person) => matchesQuery(`${person.name} ${person.handle} ${person.role}`))
          .map((person) => ({ userId: person.id, name: person.name, handle: person.handle, role: person.role, status: person.status, color: person.color }))
      : [];

    const channels = !from && !hasFile
      ? db.channels
          .filter((item) => (!channel || item.id === channel) && matchesQuery(`${item.name} ${item.description} ${item.topic}`))
          .map((item) => ({ channelId: item.id, name: item.name, description: item.description, topic: item.topic }))
      : [];

    messages.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    files.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return {
      messages: messages.slice(0, 25),
      files: files.slice(0, 25),
      people: people.slice(0, 15),
      channels: channels.slice(0, 15),
    };
  }

  function createDirect(userId, otherId) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.SEND_DMS);
    const other = mustUser(otherId);
    if (other.id === user.id) throw new HttpError(400, "Choose someone else");
    const existing = db.conversations.find(
      (conversation) =>
        conversation.type === "dm" &&
        conversation.participantIds.length === 2 &&
        conversation.participantIds.includes(user.id) &&
        conversation.participantIds.includes(other.id)
    );
    if (existing) {
      return {
        id: existing.id,
        type: existing.type,
        name: existing.name,
        participantIds: existing.participantIds,
        memberCount: existing.participantIds.length,
        unread: unreadConversation(user.id, existing.id),
      };
    }
    const conversation = {
      id: uid("dm"),
      type: "dm",
      name: null,
      participantIds: [user.id, other.id],
    };
    db.conversations.push(conversation);
    for (const id of [user.id, other.id]) {
      ensureRead(id);
      db.reads[id].conversations[conversation.id] = new Date().toISOString();
    }
    persist();
    return { ...conversation, memberCount: 2, unread: 0 };
  }

  function createChannel(userId, body) {
    const user = mustUser(userId);
    assertCan(user, PERMISSIONS.MANAGE_CHANNELS);
    const name = String(body.name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const description = String(body.description || "").trim().slice(0, 160);
    const category = String(body.category || "").trim().slice(0, 40);
    if (!/^[a-z0-9-]{2,32}$/.test(name)) throw new HttpError(400, "Channel name should be 2–32 letters, numbers, or hyphens");
    if (db.channels.some((channel) => channel.name === name)) throw new HttpError(400, "That channel already exists");
    if (!description) throw new HttpError(400, "Add a short description");
    if (!category) throw new HttpError(400, "Choose a category");
    if (!db.categories.includes(category)) db.categories.push(category);
    const channel = {
      id: uid("ch"),
      name,
      category,
      description,
      topic: description,
    };
    db.channels.push(channel);
    for (const id of Object.keys(db.reads)) {
      ensureRead(id);
      db.reads[id].channels[channel.id] = new Date().toISOString();
    }
    persist();
    return { ...channel, unread: 0 };
  }

  return {
    getUser,
    bootstrap,
    inbox,
    channelMessages,
    conversationMessages: (userId, conversationId) => conversationMessages(mustUser(userId), conversationId),
    getThread: (userId, messageId) => getThread(mustUser(userId), messageId),
    createChannelMessage,
    createConversationMessage,
    createReply,
    toggleReaction,
    vote,
    setPin,
    deleteMessage,
    markChannelRead,
    markConversationRead,
    markNotificationsRead,
    listBookmarks,
    addBookmark,
    removeBookmark,
    search,
    createChannel,
    createDirect,
  };
}

function startOfDay(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day, 0, 0) - 5.5 * 60 * 60 * 1000).toISOString();
}

function endOfDay(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59) - 5.5 * 60 * 60 * 1000).toISOString();
}

module.exports = { openStore };
