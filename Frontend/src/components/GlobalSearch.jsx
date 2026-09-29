import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "../api";
import { useWorkspace } from "../context/WorkspaceContext";
import { formatDay } from "../lib/format";

export function GlobalSearch() {
  const { searchOpen, searchChannel, channels, users, closeSearch, openResult, selectChannel, openDirect } = useWorkspace();
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [channel, setChannel] = useState(searchChannel || "");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [hasFile, setHasFile] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const closeRef = useRef(closeSearch);
  closeRef.current = closeSearch;

  useEffect(() => {
    if (!searchOpen) return undefined;
    setChannel(searchChannel || "");
    setQuery("");
    setResults(null);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    function onKey(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [searchOpen, searchChannel]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const handle = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (from) params.set("from", from);
      if (channel) params.set("channel", channel);
      if (before) params.set("before", before);
      if (after) params.set("after", after);
      if (hasFile) params.set("hasFile", "1");
      if (![query.trim(), from, channel, before, after, hasFile].some(Boolean)) {
        setResults(null);
        return;
      }
      try {
        setResults(await api(`/api/search?${params.toString()}`));
        setError("");
      } catch (err) {
        setError(err.message);
      }
    }, 150);
    return () => window.clearTimeout(handle);
  }, [searchOpen, query, from, channel, before, after, hasFile]);

  if (!searchOpen) return null;
  const groups = results || { messages: [], files: [], people: [], channels: [] };
  const empty = results && !groups.messages.length && !groups.files.length && !groups.people.length && !groups.channels.length;

  return (
    <div className="modal-scrim" onMouseDown={closeSearch}>
      <div className="modal search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2 id="search-title" className="sr">Search Coding Hub</h2>
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Coding Hub..." aria-label="Search Coding Hub" />
          <button type="button" className="icon-btn" aria-label="Close search" onClick={closeSearch}><X size={16} /></button>
        </header>
        <div className="filters">
          <label>From
            <select value={from} onChange={(event) => setFrom(event.target.value)}>
              <option value="">Anyone</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label>Channel
            <select value={channel} onChange={(event) => setChannel(event.target.value)}>
              <option value="">Any channel</option>
              {channels.map((item) => <option key={item.id} value={item.id}>#{item.name}</option>)}
            </select>
          </label>
          <label>After
            <input type="date" value={after} onChange={(event) => setAfter(event.target.value)} />
          </label>
          <label>Before
            <input type="date" value={before} onChange={(event) => setBefore(event.target.value)} />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={hasFile} onChange={(event) => setHasFile(event.target.checked)} />
            Has file
          </label>
        </div>
        <div className="search-results">
          {!results ? <p className="empty-copy">Search messages, files, people, and channels.</p> : null}
          {error ? <p className="error-line">{error}</p> : null}
          {empty ? <p className="empty-copy">No matches.</p> : null}
          {groups.messages.length ? (
            <section>
              <h3>Messages</h3>
              {groups.messages.map((item) => {
                const author = users.find((user) => user.id === item.authorId);
                const itemChannel = channels.find((entry) => entry.id === item.channelId);
                return (
                  <button type="button" key={`${item.focusId}-m`} className="result" onClick={() => openResult(item)}>
                    <span className="result-kicker">{itemChannel ? `#${itemChannel.name}` : "Conversation"} · {author?.name} · {formatDay(item.createdAt)}</span>
                    <span className="result-snippet">{item.snippet}</span>
                  </button>
                );
              })}
            </section>
          ) : null}
          {groups.files.length ? (
            <section>
              <h3>Files</h3>
              {groups.files.map((item) => {
                const itemChannel = channels.find((entry) => entry.id === item.channelId);
                return (
                  <button type="button" key={`${item.url}-${item.focusId}`} className="result" onClick={() => openResult(item)}>
                    <span className="result-kicker">{itemChannel ? `#${itemChannel.name}` : "Conversation"}</span>
                    <span className="result-snippet">{item.name}</span>
                  </button>
                );
              })}
            </section>
          ) : null}
          {groups.people.length ? (
            <section>
              <h3>People</h3>
              {groups.people.map((person) => (
                <button
                  type="button"
                  key={person.userId}
                  className="result"
                  onClick={async () => {
                    closeSearch();
                    await openDirect(person.userId);
                  }}
                >
                  <span className="result-snippet">{person.name}</span>
                  <span className="result-kicker">{person.role} · @{person.handle}</span>
                </button>
              ))}
            </section>
          ) : null}
          {groups.channels.length ? (
            <section>
              <h3>Channels</h3>
              {groups.channels.map((item) => (
                <button type="button" key={item.channelId} className="result" onClick={() => { closeSearch(); selectChannel(item.channelId); }}>
                  <span className="result-snippet">#{item.name}</span>
                  <span className="result-kicker">{item.description}</span>
                </button>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
