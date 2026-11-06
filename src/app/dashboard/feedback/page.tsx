"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useAccount } from "@/components/account-provider";
import { useProfile } from "@/components/profile-provider";
import { useApi } from "@/lib/use-api";
import { ApiError } from "@/lib/api";

type FeedbackType =
  | "appreciation"
  | "suggestion"
  | "event_idea"
  | "issue_bug"
  | "general_query";

const FEEDBACK_TYPES: {
  id: FeedbackType;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
}[] = [
  {
    id: "appreciation",
    label: "Appreciation",
    shortLabel: "Appreciation",
    emoji: "",
    description: "Kudos for recent events, workshops, or contests",
  },
  {
    id: "suggestion",
    label: "Suggestion & Improvement",
    shortLabel: "Suggestion",
    emoji: "",
    description: "Ideas to enhance our platform, sessions, or club format",
  },
  {
    id: "event_idea",
    label: "Future Event & Workshop Idea",
    shortLabel: "Event Idea",
    emoji: "",
    description: "Topics, guest lectures, hackathons, or contests you want",
  },
  {
    id: "issue_bug",
    label: "Club Issue / Operational Bug",
    shortLabel: "Issue / Bug",
    emoji: "",
    description: "Operational problems, website bugs, or difficulties faced",
  },
  {
    id: "general_query",
    label: "General Member Query",
    shortLabel: "General Query",
    emoji: "",
    description: "Questions about community initiatives, doubts, or roadmap",
  },
];

const RATINGS = [
  { value: 1, emoji: "😞", label: "Needs Work" },
  { value: 2, emoji: "😐", label: "Okay" },
  { value: 3, emoji: "🙂", label: "Good" },
  { value: 4, emoji: "😍", label: "Great" },
  { value: 5, emoji: "🔥", label: "Awesome!" },
];

export default function FeedbackPage() {
  const { account } = useAccount();
  const { profile } = useProfile();
  const api = useApi();

  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayName = account?.displayName || profile.displayName || "Member";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!feedbackType) {
      setErrorMsg("Please select a feedback type.");
      return;
    }
    if (!rating) {
      setErrorMsg("Please select an experience rating.");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setErrorMsg("Please write at least 5 characters of feedback.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await api<{ ok: boolean; message: string }>("/api/feedback", {
        method: "POST",
        body: {
          feedbackType,
          rating,
          message: message.trim(),
        },
      });

      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Failed to submit feedback. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setMessage("");
    setRating(null);
    setFeedbackType(null);
    setSubmitted(false);
    setErrorMsg(null);
  }

  return (
    <div className="w-full max-w-[580px] mx-auto py-6 sm:py-10 px-4">
      {/* Header section - centered, compact, readable */}
      <div className="relative mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)] text-center">
          Feedback & Suggestions
        </h1>
        <p className="mt-2 text-center text-xs sm:text-sm text-[var(--text-secondary)] mx-auto leading-relaxed max-w-md">
          We value member thoughts to make KPH workshops, coding contests, and community sessions
          better.
        </p>
      </div>

      {submitted ? (
        /* Success Screen */
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 text-center shadow-lg animate-fade-in">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] text-center">
            Thank You, {displayName}!
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] mx-auto text-center leading-relaxed">
            Your feedback has been received and dispatched to{" "}
            <span className="font-semibold text-[var(--text)]">kph.jiit@gmail.com</span>. The KPH
            Core Council reviews every suggestion weekly.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="button button-primary w-full sm:w-auto text-xs px-5 py-2.5"
            >
              <Send size={13} />
              <span>Submit Another Feedback</span>
            </button>
            <Link
              href="/dashboard"
              className="button button-secondary w-full sm:w-auto text-xs px-5 py-2.5"
            >
              <span>Back to Dashboard</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        /* Feedback Form - Compact horizontally & center-aligned */
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-md space-y-6"
        >
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-500">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. FEEDBACK TYPE - Center aligned heading and center aligned pill options */}
          <div>
            <div className="text-center mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                Feedback Type <span className="text-rose-500">*</span>
              </label>
            </div>

            {/* Pill chips row - Center aligned */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              {FEEDBACK_TYPES.map((type) => {
                const isSelected = feedbackType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFeedbackType(type.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 sm:px-3.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-semibold shadow-xs ring-1 ring-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <span>{type.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. EXPERIENCE RATING - Symmetrical 5-column grid, responsive on all phones */}
          <div className="w-full max-w-[440px] mx-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3.5 sm:p-4 text-center shadow-xs">
            <div className="text-center mb-2.5">
              <label className="text-xs font-bold text-[var(--text)] block">
                How was your recent club experience?
              </label>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Rating:{" "}
                {rating ? (
                  <span className="font-semibold text-[var(--accent)]">
                    {RATINGS.find((r) => r.value === rating)?.label}
                  </span>
                ) : (
                  <span className="font-medium text-[var(--muted)]">
                    Select an emoji below
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-5 gap-1 sm:gap-2 w-full">
              {RATINGS.map((r) => {
                const isSelected = rating === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(r.value)}
                    className={`group flex flex-col items-center justify-center min-h-[58px] sm:min-h-[66px] rounded-xl border p-1 sm:p-1.5 transition-all ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 scale-105 shadow-sm ring-1 ring-[var(--accent)]"
                        : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]"
                    }`}
                    title={r.label}
                  >
                    <span className="text-xl sm:text-2xl transition-transform group-hover:scale-110 select-none">
                      {r.emoji}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-medium mt-1 leading-tight text-center ${
                        isSelected ? "text-[var(--accent)] font-semibold" : "text-[var(--muted)]"
                      }`}
                    >
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. FEEDBACK MESSAGE - Center aligned label, clean textarea, character count */}
          <div>
            <div className="text-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                Your Feedback <span className="text-rose-500">*</span>
              </label>
            </div>
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your thoughts, what went well, what we should improve, or what problem/contest we should organize next..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-y leading-relaxed"
            />
            <div className="text-right mt-1">
              <span className="text-[11px] font-mono text-[var(--muted)]">
                {message.length} / 1000
              </span>
            </div>
          </div>

          {/* 4. SUBMIT ACTION - Adjustable size, centered button */}
          <div className="flex flex-col items-center justify-center pt-1 gap-2">
            <button
              type="submit"
              disabled={submitting || !feedbackType || !rating || !message.trim()}
              className="button button-primary px-8 py-2.5 text-xs font-bold shadow-md rounded-xl justify-center w-auto min-w-[200px] disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Sending to kph.jiit@gmail.com...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Submit Feedback →</span>
                </>
              )}
            </button>
            <p className="mt-6 text-center text-[11px] text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
              Managed by Knuth Programming Hub Core Council. All submissions are sent directly to{" "}
              <a
                href="mailto:kph.jiit@gmail.com"
                className="underline hover:text-[var(--text)] font-medium"
              >
                kph.jiit@gmail.com
              </a>
              .
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
