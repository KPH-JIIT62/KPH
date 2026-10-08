"use client";

import { useContests } from "@/lib/use-contests";
import { ContestHighlight } from "@/components/contests/contest-tile";
import AITextLoading from "@/components/ui/ai-text-loading";

// The dashboard shows one tile per contest, straight from the database, so a new contest appears here by itself.
export default function DashboardPage() {
  const { state, retry } = useContests();
  return (
    <div className="section-page">
      {state.status === "loading" && <AITextLoading />}
      {state.status === "error" && (
        <div role="alert">
          <p className="form-error">{state.error}</p>
          <button className="button button-secondary" onClick={retry}>Try again</button>
        </div>
      )}
      {state.status === "ready" && state.contests.map((contest) => <ContestHighlight key={contest.id} contest={contest} />)}
    </div>
  );
}
