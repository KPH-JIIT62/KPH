"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useAccount } from "@/components/account-provider";
import { AppLoader } from "@/components/app-loader";
import { ProfileDetailsForm } from "@/components/onboarding/profile-details-form";

export default function OnboardingPage() {
  const { user, loading, logOut } = useAuth();
  const { status, account, error, reload, saveProfile } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);
  // Already onboarded (or just finished saving)? Go to the dashboard.
  useEffect(() => {
    if (status === "ready" && account?.profileCompleted) router.replace("/dashboard");
  }, [status, account, router]);

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
  if (loading || !user || status !== "ready" || !account || account.profileCompleted)
    return <AppLoader />;

  return (
    <main className="login-page">
      <section className="profile-panel onboarding-panel" aria-labelledby="onboarding-title">
        <div className="page-heading">
          <div>
            <h1 id="onboarding-title">
              Welcome, {account.displayName.split(/\s+/)[0]}
              <span className="greeting-dot">.</span>
            </h1>
          </div>
        </div>
        <ProfileDetailsForm
          initial={account.profile}
          submitLabel="Save and continue"
          onSubmit={saveProfile}
          mode="onboarding"
        />
        <p className="onboarding-signout">
          Not you?{" "}
          <button type="button" className="link-button" onClick={() => void logOut()}>
            Sign out
          </button>
        </p>
      </section>
    </main>
  );
}
