export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function parseRoute(hash) {
  const parts = (hash || "").replace(/^#/, "").split("/").filter(Boolean);
  if (parts[0] === "saved") return { active: { type: "saved", id: "saved" }, threadId: null };
  if (parts[0] === "dm" && parts[1]) {
    return {
      active: { type: "dm", id: decodeURIComponent(parts[1]) },
      threadId: parts[2] === "t" ? parts[3] : null,
    };
  }
  if (parts[0] === "c" && parts[1]) {
    return {
      active: { type: "channel", id: decodeURIComponent(parts[1]) },
      threadId: parts[2] === "t" ? parts[3] : null,
    };
  }
  return { active: { type: "channel", id: "ch-problems" }, threadId: null };
}

export function routeHash(active, threadId) {
  if (!active || active.type === "saved") return "#/saved";
  const base = active.type === "dm" ? `#/dm/${active.id}` : `#/c/${active.id}`;
  return threadId ? `${base}/t/${threadId}` : base;
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatTime(iso) {
  const date = new Date(iso);
  const time = timeFormat.format(date);
  const day = dayFormat.format(date);
  return day === dayFormat.format(new Date()) ? time : `${day}, ${time}`;
}

export function formatDay(iso) {
  return dayFormat.format(new Date(iso));
}

export function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function previewText(message) {
  if (!message || message.deleted) return "Message removed";
  if (message.poll?.question) return message.poll.question;
  if (message.resource?.title) return message.resource.title;
  const line = String(message.content || "").split("\n").map((item) => item.trim()).find(Boolean);
  if (line) return line.slice(0, 160);
  if (message.problem) return `${message.problem.platform} ${message.problem.id}`;
  if (message.attachments?.length) return message.attachments[0].name;
  return "Empty message";
}

export function sameList(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
