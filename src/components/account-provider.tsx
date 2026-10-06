"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiError, apiFetch } from "@/lib/api";
import type { Account, ProfileInput } from "@/types/account";

// "Account" = our own database record for the signed-in person (role, batch, handles...).
// Firebase says WHO they are; the backend tells us everything else about them.
type Status = "idle" | "loading" | "ready" | "error";
type AccountState = { status: Status; account: Account | null; error: string };
type AccountContextValue = AccountState & {
  reload: () => void;
  saveProfile: (input: ProfileInput) => Promise<void>;
  // Replace the stored account with a newer one an API call just returned, without the loading flash a reload causes.
  applyAccount: (account: Account) => void;
};
const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AccountState>({ status: "loading", account: null, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ status: "idle", account: null, error: "" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", account: null, error: "" });
    (async () => {
      try {
        const token = await user.getIdToken(); // Firebase refreshes it automatically when it is about to expire
        const { user: account } = await apiFetch<{ user: Account }>("/api/users/me", token);
        if (!cancelled) setState({ status: "ready", account, error: "" });
      } catch (cause) {
        if (cancelled) return;
        const message = cause instanceof ApiError ? cause.message : "We couldn’t load your profile. Please try again.";
        setState({ status: "error", account: null, error: message });
      }
    })();
    return () => {
      cancelled = true; // ignore the answer if the user changed while we were waiting
    };
  }, [user, authLoading, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (!user) throw new Error("Not signed in");
      const token = await user.getIdToken();
      const { user: account } = await apiFetch<{ user: Account }>("/api/users/me/profile", token, { method: "PUT", body: input });
      setState({ status: "ready", account, error: "" }); // errors (ApiError) propagate to the form
    },
    [user],
  );

  const applyAccount = useCallback((account: Account) => setState({ status: "ready", account, error: "" }), []);

  const value = useMemo(() => ({ ...state, reload, saveProfile, applyAccount }), [state, reload, saveProfile, applyAccount]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccount must be used within AccountProvider");
  return context;
}
