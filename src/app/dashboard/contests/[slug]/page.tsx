"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Check, Hourglass } from "lucide-react";
import { useAccount } from "@/components/account-provider";
import { ContestRegistrationForm, type RegistrationValues } from "@/components/contests/contest-registration-form";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatContestDate, formatContestWhen, formatRegistrationDeadline } from "@/lib/contest-format";
import type { Account } from "@/types/account";
import type { ContestDetail, ContestRegistration } from "@/types/contest";
import AITextLoading from "@/components/ui/ai-text-loading";

type State = { status: "loading" | "ready" | "notfound" | "error"; detail: ContestDetail | null; error: string };

export default function ContestPage() {
  const { slug } = useParams<{ slug: string }>();
  const api = useApi();
  const { account, applyAccount } = useAccount();
  const [state, setState] = useState<State>({ status: "loading", detail: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading", detail: null, error: "" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<ContestDetail>(`/api/contests/${encodeURIComponent(slug)}`)
      .then((detail) => !cancelled && setState({ status: "ready", detail, error: "" }))
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 404) setState({ status: "notfound", detail: null, error: "" });
        else setState({ status: "error", detail: null, error: cause instanceof ApiError ? cause.message : "Couldn’t load this contest." });
      });
    return () => {
      cancelled = true;
    };
  }, [api, slug, attempt]);

  async function register(values: RegistrationValues) {
    const result = await api<{ registration: ContestRegistration; user: Account }>(`/api/contests/${encodeURIComponent(slug)}/registrations`, {
      method: "POST",
      body: values,
    });
    applyAccount(result.user); // the HackerRank ID was also saved to the profile: show it everywhere without reloading
    setState((current) => (current.detail ? { ...current, detail: { ...current.detail, registration: result.registration } } : current));
  }

  const back = (
    <Link href="/dashboard/contests" className="back-link">
      <ArrowLeft size={15} aria-hidden="true" /> All contests
    </Link>
  );

  if (state.status === "loading") return <div className="section-page"><AITextLoading /></div>;
  if (state.status === "notfound")
    return (
      <div className="section-page">
        {back}
        <p className="panel-help">We couldn’t find that contest.</p>
      </div>
    );
  if (state.status === "error" || !state.detail || !account)
    return (
      <div className="section-page" role="alert">
        {back}
        <p className="form-error">{state.error || "Couldn’t load this contest."}</p>
        <button className="button button-secondary" onClick={retry}>Try again</button>
      </div>
    );

  const { contest, registration } = state.detail;
  return (
    <div className="section-page">
      {back}
      <section className="page-heading">
        <div>
          <h1>
            {contest.title}
            <span className="greeting-dot">.</span>
          </h1>
          <p className="contest-meta">
            <CalendarClock size={15} aria-hidden="true" /> {formatContestWhen(contest.startsAt, contest.endsAt)}
          </p>
          {contest.registrationStatus === "OPEN" && !registration && contest.registrationClosesAt && (
            <p className="contest-meta contest-deadline">
              <Hourglass size={15} aria-hidden="true" /> {formatRegistrationDeadline(contest.registrationClosesAt)}
            </p>
          )}
        </div>
      </section>

      {registration ? (
        <div className="profile-panel">
          <span className="status-pill is-done">
            <Check size={13} aria-hidden="true" /> You’re registered
          </span>
          <dl className="summary-list registered-details">
            <dt>Name</dt>
            <dd>{account.displayName}</dd>
            <dt>Enrollment number</dt>
            <dd>{account.profile.enrollmentNo}</dd>
            <dt>Batch · Branch</dt>
            <dd>
              {account.profile.batch} · {account.profile.branch}
            </dd>
            <dt>Year of Study</dt>
            <dd>{account.profile.academic.yearOfStudyLabel ?? "—"}</dd>
            <dt>HackerRank ID</dt>
            <dd>{registration.hackerrankHandle}</dd>
            <dt>Registered on</dt>
            <dd>{formatContestDate(registration.createdAt)}</dd>
          </dl>
        </div>
      ) : contest.registrationStatus === "SOON" ? (
        <div className="profile-panel">
          <span className="status-pill is-soon">Registrations Opening Soon</span>
          <p className="panel-help">Registration hasn’t opened yet. Check back soon.</p>
        </div>
      ) : contest.registrationStatus === "CLOSED" ? (
        <div className="profile-panel">
          <span className="status-pill is-closed">Registration closed</span>
          <p className="panel-help">Registration for this contest has closed.</p>
        </div>
      ) : (
        <div className="profile-panel">
          <ContestRegistrationForm account={account} onSubmit={register} />
        </div>
      )}
    </div>
  );
}
