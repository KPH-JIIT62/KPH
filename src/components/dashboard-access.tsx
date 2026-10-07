"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useAccount } from "@/components/account-provider";
import { AppLoader } from "@/components/app-loader";

// UX gate only (the real protection is the backend): signed out -> login, profile incomplete -> onboarding.
export function DashboardAccess({ children }: { children: ReactNode }) {
  const { user, loading, logOut } = useAuth();
  const { status, account, error, reload } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);
  useEffect(() => {
    if (status === "ready" && account && !account.profileCompleted) router.replace("/onboarding");
  }, [status, account, router]);

  if (loading || !user)
    return <AppLoader />;
  if (status === "error")
    return (
      <main className="auth-loading" role="alert">
        <div>
          <p>{error}</p>
          <div className="form-footer">
            <button className="button button-primary" onClick={reload}>Try again</button>
            <button className="button button-secondary" onClick={() => void logOut()}>Sign out</button>
          </div>
        </div>
      </main>
    );
  if (status !== "ready" || !account?.profileCompleted)
    return <AppLoader />;
  return children;
}
