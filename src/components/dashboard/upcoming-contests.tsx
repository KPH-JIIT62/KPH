import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContestHighlight } from "@/components/contests/contest-tile";
import { isUpcoming } from "@/lib/contest-format";
import type { ContestSummary } from "@/types/contest";

// The "Upcoming Contests" section of the dashboard: one tile per contest that has not finished yet.
// Finished contests are not listed here (the Contests page still shows every contest).
export function UpcomingContests({ contests, now }: { contests: ContestSummary[]; now?: Date }) {
  const upcoming = contests.filter((contest) => isUpcoming(contest, now));
  return (
    <section className="dashboard-section" aria-labelledby="upcoming-contests-heading">
      <div className="dashboard-section-header">
        <h2 id="upcoming-contests-heading">Upcoming Contests</h2>
        <Link href="/dashboard/contests" className="dashboard-section-link">
          All contests <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="panel-help">No upcoming contests right now. Check back soon.</p>
      ) : (
        <div className="upcoming-grid">
          {upcoming.map((contest) => (
            <ContestHighlight key={contest.id} contest={contest} />
          ))}
        </div>
      )}
    </section>
  );
}
