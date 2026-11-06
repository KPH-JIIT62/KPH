"use client";

import { useContests } from "@/lib/use-contests";
import { useSessions } from "@/lib/use-sessions";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import AITextLoading from "@/components/ui/ai-text-loading";

export default function DashboardPage() {
  const contests = useContests();
  const sessions = useSessions();
  const loading =
    contests.state.status === "loading" && sessions.state.status === "loading";

  if (loading) {
    return (
      <div className="section-page">
        <AITextLoading />
      </div>
    );
  }

  return (
    <div className="section-page py-2 sm:py-4">
      <DashboardHero
        contests={contests.state.contests}
        sessions={sessions.state.sessions}
      />
    </div>
  );
}
