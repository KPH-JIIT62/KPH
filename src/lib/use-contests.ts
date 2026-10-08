"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ContestSummary } from "@/types/contest";

type State = { status: "loading" | "ready" | "error"; contests: ContestSummary[]; error: string };

// Loads the contest list for the signed-in person. Used by the Contests page AND the dashboard,
// so both always show the same contests from the same source (the database).
export function useContests() {
  const api = useApi();
  const [state, setState] = useState<State>({ status: "loading", contests: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading", contests: [], error: "" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ contests: ContestSummary[] }>("/api/contests")
      .then(({ contests }) => !cancelled && setState({ status: "ready", contests, error: "" }))
      .catch((cause) => {
        if (!cancelled) setState({ status: "error", contests: [], error: cause instanceof ApiError ? cause.message : "Couldn’t load contests." });
      });
    return () => {
      cancelled = true;
    };
  }, [api, attempt]);

  return { state, retry };
}
