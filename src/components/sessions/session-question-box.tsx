"use client";

import { useState, type FormEvent } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function SessionQuestionBox({ slug }: { slug: string }) {
  const api = useApi();
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      await api<{ question: { id: string; createdAt: string } }>(`/api/sessions/${encodeURIComponent(slug)}/questions`, {
        method: "POST",
        body: { question },
      });
      setQuestion("");
      setMessage("Your question has been sent to the seniors.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not send your question. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="profile-panel session-question-panel" aria-labelledby="session-question-title">
      <div className="session-question-heading">
        <MessageCircleQuestion size={20} aria-hidden="true" />
        <h2 id="session-question-title">Ask the seniors</h2>
      </div>
      <p className="panel-help">Ask about placements, working in the industry, or how DSA and competitive programming are used in practice.</p>
      <form onSubmit={submit}>
        <label className="session-question-label" htmlFor="session-question">Your question</label>
        <textarea
          id="session-question"
          name="question"
          aria-describedby="session-question-notice"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={5000}
          rows={7}
          required
          placeholder="What would you like to ask?"
          disabled={submitting}
        />
        <p id="session-question-notice" className="session-question-notice">Your data will be recorded once you ask a question</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button button-primary" type="submit" disabled={submitting || !question.trim()}>
          {submitting ? "Sending…" : "Ask question"}
        </button>
      </form>
    </aside>
  );
}
