import { useEffect, useState } from "react";

export function PollMessage({ poll, onVote }) {
  const voted = poll.options.some((option) => option.mine);
  const [selected, setSelected] = useState(() => poll.options.filter((option) => option.mine).map((option) => option.id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(poll.options.filter((option) => option.mine).map((option) => option.id));
  }, [poll]);

  function toggle(id) {
    setSelected((current) => {
      if (poll.allowMultiple) {
        return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      }
      return [id];
    });
  }

  async function submit() {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      await onVote(selected);
    } finally {
      setBusy(false);
    }
  }

  const total = poll.totalVoters || 0;
  return (
    <div className="poll">
      <div className="poll-q">{poll.question}</div>
      <div className="poll-options" role="group" aria-label={poll.question}>
        {poll.options.map((option) => {
          const pct = total ? Math.round((option.count / total) * 100) : 0;
          return (
            <label key={option.id} className={voted ? "poll-option results" : "poll-option"}>
              {voted ? <span className="poll-bar" style={{ width: `${pct}%` }} /> : null}
              <input
                type={poll.allowMultiple ? "checkbox" : "radio"}
                name={`poll-${poll.options[0]?.id || "option"}`}
                checked={selected.includes(option.id)}
                onChange={() => toggle(option.id)}
              />
              <span className="poll-label">{option.text}</span>
              {voted ? <span className="poll-count">{option.count} · {pct}%</span> : null}
            </label>
          );
        })}
      </div>
      <div className="poll-foot">
        <span>{total} {total === 1 ? "vote" : "votes"}{poll.allowMultiple ? " · multiple answers" : ""}</span>
        <button type="button" className="solid-btn" onClick={submit} disabled={!selected.length || busy}>
          {voted ? "Update vote" : "Vote"}
        </button>
      </div>
    </div>
  );
}
