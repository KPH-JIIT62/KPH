import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SessionHighlight } from "@/components/sessions/session-tile";
import { isUpcoming } from "@/lib/contest-format";
import type { SessionSummary } from "@/types/session";

// The "Upcoming Sessions" section of the dashboard: one tile per session that has not finished yet.
// Finished sessions are not listed here (the Sessions page still shows every session).
export function UpcomingSessions({ sessions, now }: { sessions: SessionSummary[]; now?: Date }) {
  const upcoming = sessions.filter((session) => isUpcoming(session, now));
  return (
    <section className="dashboard-section" aria-labelledby="upcoming-sessions-heading">
      <div className="dashboard-section-header">
        <h2 id="upcoming-sessions-heading">Upcoming Sessions</h2>
        <Link href="/dashboard/sessions" className="dashboard-section-link">
          All sessions <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="panel-help">No upcoming sessions right now. Check back soon.</p>
      ) : (
        <div className="upcoming-grid">
          {upcoming.map((session) => (
            <SessionHighlight key={session.id} session={session} />
          ))}
        </div>
      )}
    </section>
  );
}
