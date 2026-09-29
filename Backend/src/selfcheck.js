const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { openStore } = require("./store");
const { crc32 } = require("./files");
const { HttpError } = require("./errors");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kph-"));
const store = openStore({
  dataFile: path.join(dir, "db.json"),
  uploadsDir: path.join(dir, "uploads"),
});

function throws(status, fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof HttpError, error);
    assert.strictEqual(error.status, status, error.message);
    return;
  }
  throw new Error(`Expected HTTP ${status}`);
}

assert.strictEqual(crc32(Buffer.from("123456789")), 0xcbf43926);

const png = fs.readFileSync(path.join(dir, "uploads", "wa-pretest2.png"));
assert.deepStrictEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
const pdf = fs.readFileSync(path.join(dir, "uploads", "binary-search-cheatsheet.pdf"));
assert.ok(pdf.subarray(0, 5).toString() === "%PDF-");
const zip = fs.readFileSync(path.join(dir, "uploads", "icpc-practice-set.zip"));
assert.strictEqual(zip.readUInt32LE(0), 0x04034b50);

const me = store.bootstrap("u-saurav");
assert.strictEqual(me.me.role, "Member");
assert.ok(!me.me.permissions.includes("pin_messages"));
assert.ok(me.me.permissions.includes("send_messages"));
assert.strictEqual(me.channels.find((channel) => channel.id === "ch-doubts").unread, 2);
assert.strictEqual(me.channels.find((channel) => channel.id === "ch-contests").unread, 1);
assert.strictEqual(me.conversations.find((conversation) => conversation.id === "dm-rahul").unread, 1);
assert.ok(me.bookmarks.some((bookmark) => bookmark.messageId === "m-prob-dp"));

const discussion = store.channelMessages("u-saurav", "ch-problems");
const problem = discussion.find((message) => message.id === "m-prob-1901");
assert.ok(problem.problem.title);
assert.strictEqual(problem.replyCount, 7);
assert.strictEqual(problem.reactions.find((reaction) => reaction.emoji === "👍").userIds.length, 3);

const thread = store.getThread("u-saurav", "m-prob-1901");
assert.strictEqual(thread.replies.length, 7);
assert.ok(thread.replies[0].content.includes("key observation"));

throws(403, () => store.setPin("u-saurav", "m-prob-dp", true));
const pinned = store.setPin("u-rahul", "m-prob-bs", true);
assert.strictEqual(pinned.isPinned, true);

throws(403, () => store.createChannelMessage("u-saurav", "ch-general", { content: "ping @mentor" }));
const mentioned = store.createChannelMessage("u-rahul", "ch-general", { content: "Need a look from @mentor on the greedy proof." });
assert.ok(mentioned.content.includes("@mentor"));
const priya = store.bootstrap("u-priya");
assert.ok(priya.notifications.some((notification) => notification.text.includes("Rahul Sharma")));

const voted = store.vote("u-saurav", "m-cont-poll", ["o-cf"]);
assert.strictEqual(voted.poll.totalVoters, 19);
assert.ok(voted.poll.options.find((option) => option.id === "o-cf").mine);

const reacted = store.toggleReaction("u-saurav", "m-prob-1901", "🔥");
assert.ok(reacted.reactions.find((reaction) => reaction.emoji === "🔥").userIds.includes("u-saurav"));
const cleared = store.toggleReaction("u-saurav", "m-prob-1901", "🔥");
assert.ok(!cleared.reactions.find((reaction) => reaction.emoji === "🔥")?.userIds.includes("u-saurav"));

const found = store.search("u-saurav", { q: "binary search" });
assert.ok(found.messages.some((item) => item.snippet.toLowerCase().includes("binary search")));
assert.ok(found.files.some((item) => item.name.toLowerCase().includes("binary search")));

const saved = store.addBookmark("u-saurav", "m-prob-1901");
assert.ok(saved.some((bookmark) => bookmark.messageId === "m-prob-1901"));
const removed = store.removeBookmark("u-saurav", "m-prob-1901");
assert.ok(!removed.some((bookmark) => bookmark.messageId === "m-prob-1901"));

throws(403, () => store.conversationMessages("u-nikhil", "grp-icpc"));

const created = store.createChannel("u-aditya", {
  name: "upsolve",
  category: "Competitive Programming",
  description: "Post-contest upsolves and editorials.",
});
assert.strictEqual(created.name, "upsolve");
throws(403, () => store.createChannel("u-saurav", { name: "secret", category: "General", description: "nope" }));

const own = store.createChannelMessage("u-saurav", "ch-general", { content: "Temporary note from the lab." });
store.deleteMessage("u-saurav", own.id);
throws(403, () => store.deleteMessage("u-saurav", "m-ann-icpc"));
store.deleteMessage("u-neha", "m-gen-lab");

const reply = store.createReply("u-sneha", "m-prob-1901", { content: "Trying the second sample with x = 1 now." });
assert.strictEqual(reply.parent.replyCount, 8);

console.log("selfcheck ok");
