"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Check } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatContestDate } from "@/lib/contest-format";
import type { ContestSummary } from "@/types/contest";

type State = { status: "loading" | "ready" | "error"; contests: ContestSummary[]; error: string };

export default function ContestsPage() {
  const api = useApi();
  const [state, setState] = useState<State>({ status: "loading", contests: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading", contests: [], error: "" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ contests: ContestSummary[] }>("/api/contests")
      .then(({ contests }) => !cancelled && setState({ status: "ready", contests, error: "" }))
      .catch((cause) => {
        if (!cancelled) setState({ status: "error", contests: [], error: cause instanceof ApiError ? cause.message : "Couldn’t load contests." });
      });
    return () => {
      cancelled = true;
    };
  }, [api, attempt]);

  return (
    <div className="section-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">COMPETE</span>
          <h1>
            Contests<span className="greeting-dot">.</span>
          </h1>
          <p>Upcoming contests you can register for.</p>
        </div>
      </section>

      {state.status === "loading" && <p className="panel-help" aria-live="polite">Loading contests…</p>}
      {state.status === "error" && (
        <div role="alert">
          <p className="form-error">{state.error}</p>
          <button className="button button-secondary" onClick={retry}>Try again</button>
        </div>
      )}
      {state.status === "ready" && state.contests.length === 0 && <p className="panel-help">No contests right now. Check back soon.</p>}
      {state.status === "ready" && state.contests.length > 0 && (
        <div className="contest-list">
          {state.contests.map((contest) => {
            const registered = Boolean(contest.registration);
            return (
              <Link key={contest.id} href={`/dashboard/contests/${contest.slug}`} className="contest-card">
                <span className={`status-pill ${registered ? "is-done" : contest.registrationOpen ? "is-open" : "is-closed"}`}>
                  {registered && <Check size={13} aria-hidden="true" />}
                  {registered ? "Registered" : contest.registrationOpen ? "Registration open" : "Registration closed"}
                </span>
                <h2>{contest.title}</h2>
                <p>{contest.description}</p>
                <div className="contest-card-footer">
                  <span className="contest-meta">
                    <CalendarClock size={15} aria-hidden="true" /> {formatContestDate(contest.startsAt)}
                  </span>
                  <span className="contest-card-cta">
                    {registered ? "View registration" : "View & register"} <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
