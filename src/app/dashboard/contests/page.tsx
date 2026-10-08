"use client";

import { useContests } from "@/lib/use-contests";
import { ContestCard } from "@/components/contests/contest-tile";
import AITextLoading from "@/components/ui/ai-text-loading";

export default function ContestsPage() {
  const { state, retry } = useContests();

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

      {state.status === "loading" && <AITextLoading />}
      {state.status === "error" && (
        <div role="alert">
          <p className="form-error">{state.error}</p>
          <button className="button button-secondary" onClick={retry}>Try again</button>
        </div>
      )}
      {state.status === "ready" && state.contests.length === 0 && <p className="panel-help">No contests right now. Check back soon.</p>}
      {state.status === "ready" && state.contests.length > 0 && (
        <div className="contest-list">
          {state.contests.map((contest) => (
            <ContestCard key={contest.id} contest={contest} />
          ))}
        </div>
      )}
    </div>
  );
}
