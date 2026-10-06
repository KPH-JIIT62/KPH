"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

// Returns a function that calls the KPH backend as the signed-in person: it fetches a fresh
// Firebase ID token for every call (Firebase refreshes it when needed) and attaches it.
export function useApi() {
  const { user } = useAuth();
  return useCallback(
    async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
      if (!user) throw new Error("Not signed in");
      return apiFetch<T>(path, await user.getIdToken(), init);
    },
    [user],
  );
}
