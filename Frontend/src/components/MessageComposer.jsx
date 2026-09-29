import { useMemo, useRef, useState } from "react";
import { AtSign, Paperclip, Send, Smile } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { AttachmentPreview } from "./AttachmentPreview";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { PollComposer } from "./PollComposer";

const EXTRA_EMOJIS = ["😀", "😅", "🤔", "🎯", "🏆", "✅"];

function mentionState(value, cursor) {
  const before = value.slice(0, cursor);
  const match = before.match(/(^|\s)@([a-z0-9]*)$/i);
  if (!match) return null;
  return { query: match[2].toLowerCase(), start: before.length - match[2].length - 1 };
}

export function MessageComposer({ placeholder, allowPoll = true, allowProblem = false, resourceMode = false, onSend, inputId = "composer-input" }) {
  const { users, mentionRoles, can, reactionEmojis, uploadFile } = useWorkspace();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [problem, setProblem] = useState(null);
  const [topic, setTopic] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const fileRef = useRef(null);

  const query = mentionState(text, boxRef.current?.selectionStart ?? text.length);
  const mentionItems = useMemo(() => {
    if (!query) return [];
    const people = users
      .filter((user) => user.handle.includes(query.query) || user.name.toLowerCase().includes(query.query))
      .slice(0, 6)
      .map((user) => ({
        id: user.id,
        token: user.handle,
        label: user.name,
        meta: user.role,
        disabled: false,
      }));
    const roles = mentionRoles
      .filter((role) => role.token.includes(query.query) || role.label.toLowerCase().includes(query.query))
      .map((role) => ({
        id: `role-${role.token}`,
        token: role.token,
        label: `@${role.label}`,
        meta: can("role_mention") ? "Role" : "Role mention",
        disabled: !can("role_mention"),
      }));
    return [...people, ...roles];
  }, [query, users, mentionRoles, can]);

  const enabledItems = mentionItems.filter((item) => !item.disabled);

  function resize(node) {
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }

  function insertAt(start, cursor, insertion) {
    const next = text.slice(0, start) + insertion + text.slice(cursor);
    setText(next);
    const position = start + insertion.length;
    requestAnimationFrame(() => {
      boxRef.current?.focus();
      boxRef.current?.setSelectionRange(position, position);
      resize(boxRef.current);
    });
  }

  function applyMention(item) {
    if (!query || item.disabled) return;
    const cursor = boxRef.current?.selectionStart ?? text.length;
    insertAt(query.start, cursor, `@${item.token} `);
    setMentionIndex(0);
  }

  async function send() {
    const content = text.trim();
    const link = linkOpen && linkUrl.trim()
      ? { kind: "link", name: linkName.trim() || linkUrl.trim(), url: linkUrl.trim() }
      : null;
    const nextAttachments = link ? [...attachments, link] : attachments;
    if (!content && !nextAttachments.length && !problem) {
      setError("Write a message first.");
      return;
    }
    if (problem && (!problem.platform.trim() || !problem.id.trim() || !problem.title.trim())) {
      setError("Problem card needs a platform, id, and title.");
      return;
    }
    let resource = null;
    if (resourceMode && nextAttachments[0]) {
      const file = nextAttachments[0];
      resource = {
        kind: file.kind === "link" ? "link" : file.kind === "pdf" ? "pdf" : "file",
        title: file.name,
        topic: topic.trim(),
        url: file.url,
        size: file.size || 0,
      };
    }
    setBusy(true);
    setError("");
    try {
      await onSend({
        content: text,
        attachments: nextAttachments,
        problem: problem
          ? {
              platform: problem.platform.trim(),
              id: problem.id.trim(),
              title: problem.title.trim(),
              difficulty: problem.difficulty.trim(),
              topic: problem.topic.trim(),
              url: problem.url.trim(),
            }
          : null,
        resource,
      });
      setText("");
      setAttachments([]);
      setProblem(null);
      setTopic("");
      setLinkOpen(false);
      setLinkUrl("");
      setLinkName("");
      setMenuOpen(false);
      if (boxRef.current) boxRef.current.style.height = "auto";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event) {
    if (query && mentionItems.length) {
      const selectable = enabledItems.length ? enabledItems : mentionItems;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((index) => (index + 1) % selectable.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((index) => (index - 1 + selectable.length) % selectable.length);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        applyMention(selectable[mentionIndex] || selectable[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setText((value) => value.replace(/@([a-z0-9]*)$/i, ""));
        return;
      }
    }
    if (event.key === "Escape" && (menuOpen || emojiOpen)) {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(false);
      setEmojiOpen(false);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const data = await uploadFile(file);
      setAttachments((current) => [...current, data.attachment].slice(0, 6));
      setMenuOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const emojis = [...reactionEmojis, ...EXTRA_EMOJIS.filter((emoji) => !reactionEmojis.includes(emoji))];

  return (
    <div className="composer-wrap">
      {attachments.length || problem || linkOpen || (resourceMode && topic) ? (
        <div className="composer-extras">
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id || attachment.url}
              attachment={attachment}
              onRemove={() => setAttachments((current) => current.filter((item) => item !== attachment))}
            />
          ))}
          {linkOpen ? (
            <div className="inline-form">
              <input value={linkUrl} placeholder="https://" onChange={(event) => setLinkUrl(event.target.value)} aria-label="Link URL" />
              <input value={linkName} placeholder="Label" onChange={(event) => setLinkName(event.target.value)} aria-label="Link label" />
              <button type="button" className="text-btn" onClick={() => { setLinkOpen(false); setLinkUrl(""); setLinkName(""); }}>Remove</button>
            </div>
          ) : null}
          {problem ? (
            <div className="inline-form problem-form">
              <input value={problem.platform} placeholder="Platform" aria-label="Platform" onChange={(event) => setProblem({ ...problem, platform: event.target.value })} />
              <input value={problem.id} placeholder="Problem ID" aria-label="Problem ID" onChange={(event) => setProblem({ ...problem, id: event.target.value })} />
              <input value={problem.title} placeholder="Title" aria-label="Problem title" onChange={(event) => setProblem({ ...problem, title: event.target.value })} />
              <input value={problem.difficulty} placeholder="Difficulty" aria-label="Difficulty" onChange={(event) => setProblem({ ...problem, difficulty: event.target.value })} />
              <input value={problem.topic} placeholder="Topic" aria-label="Topic" onChange={(event) => setProblem({ ...problem, topic: event.target.value })} />
              <input value={problem.url} placeholder="Link (optional)" aria-label="Problem link" onChange={(event) => setProblem({ ...problem, url: event.target.value })} />
              <button type="button" className="text-btn" onClick={() => setProblem(null)}>Remove</button>
            </div>
          ) : null}
          {resourceMode && (attachments.length || linkOpen) ? (
            <input value={topic} placeholder="Topic, e.g. Dynamic Programming" aria-label="Resource topic" onChange={(event) => setTopic(event.target.value)} />
          ) : null}
        </div>
      ) : null}
      <div className="composer">
        {query && mentionItems.length ? (
          <MentionAutocomplete items={mentionItems} activeId={enabledItems[mentionIndex]?.id} onSelect={applyMention} />
        ) : null}
        <label className="sr" htmlFor={inputId}>{placeholder}</label>
        <textarea
          id={inputId}
          ref={boxRef}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(event) => {
            setText(event.target.value);
            setMentionIndex(0);
            resize(event.target);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="composer-bar">
          <button type="button" className="icon-btn" aria-label="Emoji" onClick={() => { setEmojiOpen((open) => !open); setMenuOpen(false); }}>
            <Smile size={16} />
          </button>
          <button type="button" className="icon-btn" aria-label="Mention" onClick={() => insertAt(text.length, text.length, text.endsWith(" ") || !text ? "@" : " @")}>
            <AtSign size={16} />
          </button>
          <button type="button" className="icon-btn" aria-label="Attach" aria-expanded={menuOpen} onClick={() => { setMenuOpen((open) => !open); setEmojiOpen(false); }}>
            <Paperclip size={16} />
          </button>
          <button type="button" className="send-btn" aria-label="Send" onClick={send} disabled={busy}>
            <Send size={15} />
          </button>
          {emojiOpen ? (
            <div className="emoji-pop composer-emoji" role="menu" aria-label="Insert emoji">
              {emojis.map((emoji) => (
                <button key={emoji} type="button" className="emoji-choice" onClick={() => { insertAt(boxRef.current?.selectionStart ?? text.length, boxRef.current?.selectionStart ?? text.length, emoji); setEmojiOpen(false); }}>
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
          {menuOpen ? (
            <div className="pop menu composer-menu" role="menu">
              <button type="button" onClick={() => fileRef.current?.click()}>Upload file</button>
              <button type="button" onClick={() => { setLinkOpen(true); setMenuOpen(false); }}>Add link</button>
              {allowPoll && can("create_polls") ? <button type="button" onClick={() => { setPollOpen(true); setMenuOpen(false); }}>Create poll</button> : null}
              {allowProblem ? (
                <button type="button" onClick={() => { setProblem({ platform: "Codeforces", id: "", title: "", difficulty: "", topic: "", url: "" }); setMenuOpen(false); }}>
                  Attach problem
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {error ? <p className="error-line" role="alert">{error}</p> : null}
      <input ref={fileRef} className="sr" type="file" onChange={onFile} />
      {pollOpen ? (
        <PollComposer
          onClose={() => setPollOpen(false)}
          onCreate={async (poll) => {
            await onSend({ content: "", poll, attachments: [], problem: null, resource: null });
            setPollOpen(false);
            setText("");
          }}
        />
      ) : null}
    </div>
  );
}
