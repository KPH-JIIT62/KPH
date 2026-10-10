"use client";

<<<<<<< Updated upstream
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
=======
import type { ReactNode } from "react";
import { useContests } from "@/lib/use-contests";
import { useSessions } from "@/lib/use-sessions";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { UpcomingContests } from "@/components/dashboard/upcoming-contests";
import { UpcomingSessions } from "@/components/dashboard/upcoming-sessions";
import AITextLoading from "@/components/ui/ai-text-loading";

// If one list can't load, say so for that list only (the other still shows), with its own "Try again".
function LoadFailed({ error, retry }: { error: string; retry: () => void }) {
>>>>>>> Stashed changes
  return (
    <div role="alert">
      <p className="form-error">{error}</p>
      <button className="button button-secondary" onClick={retry}>Try again</button>
    </div>
  );
}

// A greeting, then "Upcoming Contests" and "Upcoming Sessions". Both come straight from the database,
// so a new contest or session appears here by itself.
export default function DashboardPage() {
  const contests = useContests();
  const sessions = useSessions();
  const loading = contests.state.status === "loading" || sessions.state.status === "loading";

  let body: ReactNode = (
    <>
      {contests.state.status === "error" ? <LoadFailed error={contests.state.error} retry={contests.retry} /> : <UpcomingContests contests={contests.state.contests} />}
      {sessions.state.status === "error" ? <LoadFailed error={sessions.state.error} retry={sessions.retry} /> : <UpcomingSessions sessions={sessions.state.sessions} />}
    </>
  );
  if (loading) body = <AITextLoading />; // one loader, not one per section

  return (
    <div className="section-page">
<<<<<<< Updated upstream
      <section className="profile-panel contest-highlight" aria-live="polite">
        <h2>Encode 26.2</h2>
        <Link href="/dashboard/contests/encode-26-2" className="button button-primary contest-highlight-cta">
          Register Now
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
=======
      <DashboardGreeting />
      {body}
>>>>>>> Stashed changes
    </div>
  );
}
