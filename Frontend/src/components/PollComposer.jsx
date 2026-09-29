import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function PollComposer({ onClose, onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const firstField = useRef(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  function updateOption(index, value) {
    setOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  async function submit(event) {
    event.preventDefault();
    const clean = options.map((option) => option.trim()).filter(Boolean);
    if (!question.trim()) {
      setError("Add a question.");
      return;
    }
    if (clean.length < 2) {
      setError("A poll needs at least two options.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate({ question: question.trim(), options: clean, allowMultiple });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <form
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="poll-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <header className="modal-head">
          <h2 id="poll-title">Create Poll</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </header>
        <label className="field">
          <span>Question</span>
          <input ref={firstField} value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={200} />
        </label>
        <div className="field">
          <span>Options</span>
          {options.map((option, index) => (
            <input
              key={index}
              value={option}
              placeholder={`Option ${index + 1}`}
              maxLength={80}
              onChange={(event) => updateOption(index, event.target.value)}
            />
          ))}
          {options.length < 8 ? (
            <button type="button" className="text-btn add-option" onClick={() => setOptions((current) => [...current, ""])}>
              + Add option
            </button>
          ) : null}
        </div>
        <label className="check-row">
          <input type="checkbox" checked={allowMultiple} onChange={(event) => setAllowMultiple(event.target.checked)} />
          Allow multiple answers
        </label>
        {error ? <p className="error-line" role="alert">{error}</p> : null}
        <footer className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="solid-btn" disabled={busy}>Create Poll</button>
        </footer>
      </form>
    </div>
  );
}
