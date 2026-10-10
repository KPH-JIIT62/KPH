"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Check, Hourglass, MapPin } from "lucide-react";
import { useAccount } from "@/components/account-provider";
import { SessionRegistrationForm } from "@/components/sessions/session-registration-form";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatContestDate, formatContestWhen, formatRegistrationDeadline } from "@/lib/contest-format";
import type { SessionDetail, SessionRegistration } from "@/types/session";
import AITextLoading from "@/components/ui/ai-text-loading";

type State = { status: "loading" | "ready" | "notfound" | "error"; detail: SessionDetail | null; error: string };

export default function SessionPage() {
  const { slug } = useParams<{ slug: string }>();
  const api = useApi();
  const { account } = useAccount();
  const [state, setState] = useState<State>({ status: "loading", detail: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading", detail: null, error: "" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<SessionDetail>(`/api/sessions/${encodeURIComponent(slug)}`)
      .then((detail) => !cancelled && setState({ status: "ready", detail, error: "" }))
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 404) setState({ status: "notfound", detail: null, error: "" });
        else setState({ status: "error", detail: null, error: cause instanceof ApiError ? cause.message : "Couldn’t load this session." });
      });
    return () => {
      cancelled = true;
    };
  }, [api, slug, attempt]);

  // No body is sent: the server reads who is registering from the signed-in user's saved profile.
  async function register() {
    const result = await api<{ registration: SessionRegistration }>(`/api/sessions/${encodeURIComponent(slug)}/registrations`, { method: "POST" });
    setState((current) => (current.detail ? { ...current, detail: { ...current.detail, registration: result.registration } } : current));
  }

  const back = (
    <Link href="/dashboard/sessions" className="back-link">
      <ArrowLeft size={15} aria-hidden="true" /> All sessions
    </Link>
  );

  if (state.status === "loading") return <div className="section-page"><AITextLoading /></div>;
  if (state.status === "notfound")
    return (
      <div className="section-page">
        {back}
        <p className="panel-help">We couldn’t find that session.</p>
      </div>
    );
  if (state.status === "error" || !state.detail || !account)
    return (
      <div className="section-page" role="alert">
        {back}
        <p className="form-error">{state.error || "Couldn’t load this session."}</p>
        <button className="button button-secondary" onClick={retry}>Try again</button>
      </div>
    );

  const { session, registration } = state.detail;
  return (
    <div className="section-page">
      {back}
      <section className="page-heading">
        <div>
          <h1>
            {session.title}
            <span className="greeting-dot">.</span>
          </h1>
          <p className="contest-meta">
            <CalendarClock size={15} aria-hidden="true" /> {formatContestWhen(session.startsAt, session.endsAt)}
          </p>
          {session.venue && (
            <p className="contest-meta">
              <MapPin size={15} aria-hidden="true" /> Venue: {session.venue}
            </p>
          )}
          {session.registrationStatus === "OPEN" && !registration && session.registrationClosesAt && (
            <p className="contest-meta contest-deadline">
              <Hourglass size={15} aria-hidden="true" /> {formatRegistrationDeadline(session.registrationClosesAt)}
            </p>
          )}
          {session.description && <p className="contest-description">{session.description}</p>}
        </div>
      </section>

      {registration ? (
        <div className="profile-panel">
          <span className="status-pill is-done">
            <Check size={13} aria-hidden="true" /> You’re registered
          </span>
          <dl className="summary-list registered-details">
            <dt>Enrollment number</dt>
            <dd>{account.profile.enrollmentNo}</dd>
            <dt>Name</dt>
            <dd>{account.displayName}</dd>
            <dt>Batch · Branch</dt>
            <dd>
              {account.profile.batch} · {account.profile.branch}
            </dd>
            <dt>Year of Study</dt>
            <dd>{account.profile.academic.yearOfStudyLabel ?? "—"}</dd>
            <dt>Registered on</dt>
            <dd>{formatContestDate(registration.createdAt)}</dd>
          </dl>
        </div>
      ) : session.registrationStatus === "SOON" ? (
        <div className="profile-panel">
          <span className="status-pill is-soon">Registrations Opening Soon</span>
          <p className="panel-help">Registration hasn’t opened yet. Check back soon.</p>
        </div>
      ) : session.registrationStatus === "CLOSED" ? (
        <div className="profile-panel">
          <span className="status-pill is-closed">Registration closed</span>
          <p className="panel-help">Registration for this session has closed.</p>
        </div>
      ) : (
        <div className="profile-panel">
          <SessionRegistrationForm account={account} onSubmit={register} />
        </div>
      )}
    </div>
  );
}
