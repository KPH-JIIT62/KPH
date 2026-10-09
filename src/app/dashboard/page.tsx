"use client";

import { useContests } from "@/lib/use-contests";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { UpcomingContests } from "@/components/dashboard/upcoming-contests";
import AITextLoading from "@/components/ui/ai-text-loading";

// A greeting, then the "Upcoming Contests" section. Contests come straight from the database, so a new contest appears here by itself.
export default function DashboardPage() {
  const { state, retry } = useContests();
  return (
    <div className="section-page">
      <DashboardGreeting />
      {state.status === "loading" && <AITextLoading />}
      {state.status === "error" && (
        <div role="alert">
          <p className="form-error">{state.error}</p>
          <button className="button button-secondary" onClick={retry}>Try again</button>
        </div>
      )}
      {state.status === "ready" && <UpcomingContests contests={state.contests} />}
    </div>
  );
}
