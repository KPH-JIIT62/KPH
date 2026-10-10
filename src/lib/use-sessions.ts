"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { SessionSummary } from "@/types/session";

type State = { status: "loading" | "ready" | "error"; sessions: SessionSummary[]; error: string };

// Loads the session list for the signed-in person. Used by the Sessions page AND the dashboard,
// so both always show the same sessions from the same source (the database).
export function useSessions() {
  const api = useApi();
  const [state, setState] = useState<State>({ status: "loading", sessions: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading", sessions: [], error: "" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ sessions: SessionSummary[] }>("/api/sessions")
      .then(({ sessions }) => !cancelled && setState({ status: "ready", sessions, error: "" }))
      .catch((cause) => {
        if (!cancelled) setState({ status: "error", sessions: [], error: cause instanceof ApiError ? cause.message : "Couldn’t load sessions." });
      });
    return () => {
      cancelled = true;
    };
  }, [api, attempt]);

  return { state, retry };
}
