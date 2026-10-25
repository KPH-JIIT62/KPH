"use client";

import { useContests } from "@/lib/use-contests";
import { ContestCard } from "@/components/contests/contest-tile";
import { isUpcoming } from "@/lib/contest-format";
import AITextLoading from "@/components/ui/ai-text-loading";

export default function ContestsPage() {
  const { state, retry } = useContests();

  const upcomingContests = state.status === "ready" ? state.contests.filter((c) => isUpcoming(c)) : [];
  const pastContests = state.status === "ready" ? state.contests.filter((c) => !isUpcoming(c)) : [];

  return (
    <div className="section-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">COMPETE</span>
          <h1>
            Contests<span className="greeting-dot">.</span>
          </h1>
          <p>Compete, build your rating, and view past contest leaderboards.</p>
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
        <div className="space-y-10">
          {/* Upcoming Contests */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Upcoming Contests</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] font-medium">
                {upcomingContests.length} {upcomingContests.length === 1 ? "contest" : "contests"}
              </span>
            </div>
            {upcomingContests.length === 0 ? (
              <p className="panel-help">No upcoming contests right now. Check back soon for announcements.</p>
            ) : (
              <div className="contest-list">
                {upcomingContests.map((contest) => (
                  <ContestCard key={contest.id} contest={contest} />
                ))}
              </div>
            )}
          </section>

          {/* Past Contests */}
          {pastContests.length > 0 && (
            <section className="pt-6 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-secondary)]">Past Contests</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--muted)] font-medium">
                  {pastContests.length} {pastContests.length === 1 ? "contest" : "contests"}
                </span>
              </div>
              <div className="contest-list">
                {pastContests.map((contest) => (
                  <ContestCard key={contest.id} contest={contest} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
