"use client";

import { useSessions } from "@/lib/use-sessions";
import { SessionCard } from "@/components/sessions/session-tile";
import AITextLoading from "@/components/ui/ai-text-loading";

export default function SessionsPage() {
  const { state, retry } = useSessions();

  return (
    <div className="section-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">LEARN</span>
          <h1>
            Sessions<span className="greeting-dot">.</span>
          </h1>
          <p>Talks and sessions you can register for.</p>
        </div>
      </section>

      {state.status === "loading" && <AITextLoading />}
      {state.status === "error" && (
        <div role="alert">
          <p className="form-error">{state.error}</p>
          <button className="button button-secondary" onClick={retry}>Try again</button>
        </div>
      )}
      {state.status === "ready" && state.sessions.length === 0 && <p className="panel-help">No sessions right now. Check back soon.</p>}
      {state.status === "ready" && state.sessions.length > 0 && (
        <div className="contest-list">
          {state.sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
