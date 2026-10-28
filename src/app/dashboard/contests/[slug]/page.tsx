"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Check, Hourglass, MapPin } from "lucide-react";
import { useAccount } from "@/components/account-provider";
import { ContestHighlights } from "@/components/contests/contest-highlights";
import { ContestRegistrationForm, type RegistrationValues } from "@/components/contests/contest-registration-form";
import { TeamRegistrationForm } from "@/components/contests/team-registration-form";
import { WithdrawRegistration } from "@/components/contests/withdraw-registration";
import { ContestLeaderboardView } from "@/components/contests/contest-leaderboard";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatContestDate, formatContestWhen, formatRegistrationDeadline, formatRegistrationWindow, cleanVenue, isUpcoming } from "@/lib/contest-format";
import type { Account } from "@/types/account";
import type { ContestDetail, ContestRegistration } from "@/types/contest";
import AITextLoading from "@/components/ui/ai-text-loading";

type State = { status: "loading" | "ready" | "notfound" | "error"; detail: ContestDetail | null; error: string };
const EXECUTE_SEATING_PLACEHOLDER = "Seating plan will be updated at 1200 hours on 31st October 2026";

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

  // Read the seating CSV on the server every 30 seconds while this registered Execute team is viewing the page.
  // This picks up a replaced CSV at runtime without requiring another application build.
  const executeTeamRegistrationId = slug === "execute-26-4" ? state.detail?.registration?.id : null;
  useEffect(() => {
    if (!executeTeamRegistrationId) return;
    let cancelled = false;
    const refreshSeating = () => {
      api<ContestDetail>(`/api/contests/${encodeURIComponent(slug)}`)
        .then((fresh) => {
          if (!cancelled) {
            setState((current) => current.detail ? {
              ...current,
              detail: {
                ...current.detail,
                registration: current.detail.registration
                  ? { ...current.detail.registration, seatingPlan: fresh.registration?.seatingPlan }
                  : null,
              },
            } : current);
          }
        })
        .catch(() => {}); // keep the last displayed plan if a transient request fails
    };
    refreshSeating();
    const timer = window.setInterval(refreshSeating, 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [api, slug, executeTeamRegistrationId]);

  // Takes the person out of this contest. The server decides whether it is still early enough; if it is not, the error
  // message it sends is shown by the confirmation panel. On success the page falls back to the registration form
  // (or the "opening soon" / "closed" panel), depending on whether registration is still open.
  async function withdraw() {
    await api<{ withdrawn: boolean }>(`/api/contests/${encodeURIComponent(slug)}/registrations/me`, { method: "DELETE" });
    retry();
  }

  async function register(values: RegistrationValues) {
    const result = await api<{ registration: ContestRegistration; user: Account }>(`/api/contests/${encodeURIComponent(slug)}/registrations`, {
      method: "POST",
      body: values,
    });
    applyAccount(result.user); // the HackerRank ID was also saved to the profile: show it everywhere without reloading
    setState((current) => (current.detail ? { ...current, detail: { ...current.detail, registration: result.registration } } : current));
  }

  async function registerTeam(values: { teamName: string; hackerrankHandle: string; memberIds: string[] }) {
    const result = await api<{ registration: ContestRegistration; user?: Account }>(`/api/contests/${encodeURIComponent(slug)}/teams`, { method: "POST", body: values });
    if (result.user) applyAccount(result.user);
    setState((current) => current.detail ? { ...current, detail: { ...current.detail, registration: result.registration } } : current);
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
  const isPast = !isUpcoming(contest);
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
          {contest.venue && (
            <p className="contest-meta">
              <MapPin size={15} aria-hidden="true" /> Venue: {cleanVenue(contest.venue)}
            </p>
          )}
          {contest.registrationStatus === "OPEN" && !registration && contest.registrationClosesAt && (
            <p className="contest-meta contest-deadline">
              <Hourglass size={15} aria-hidden="true" />{" "}
              {contest.registrationStartsAt
                ? formatRegistrationWindow(contest.registrationStartsAt, contest.registrationClosesAt)
                : formatRegistrationDeadline(contest.registrationClosesAt)}
            </p>
          )}
          <ContestHighlights contest={contest} />
          {contest.registrationStatus === "OPEN" && !registration && <span className="status-pill is-open contest-registration-open">Registration Open</span>}
          {contest.description && <p className="contest-description">{contest.description}</p>}
        </div>
      </section>

      {(() => {
        if (registration) {
          return (
            <div className={slug === "execute-26-4" ? "execute-registration-columns" : undefined}>
            <div className="profile-panel">
              {contest.mandatory && <span className="status-pill is-mandatory">MANDATORY</span>}
              <span className="status-pill is-done">
                <Check size={13} aria-hidden="true" /> {isPast ? "You participated" : "You’re registered"}
              </span>
              <dl className="summary-list registered-details">
                {registration.teamName && <><dt>Team Name</dt><dd>{registration.teamName}</dd></>}
                {registration.members?.map((member) => <Fragment key={member.enrollmentNo}><dt>{member.role === "LEADER" ? "Team Leader" : "Team Member"}</dt><dd>{member.name} · {member.enrollmentNo} · {member.batch} · {member.branch}</dd></Fragment>)}
                {!registration.teamName && <><dt>Name</dt>
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
                </>}
              </dl>
              {!isPast && (
                slug === "execute-26-4" && registration.role !== "LEADER" ? (
                  <p className="panel-help">Only the team leader can withdraw this team registration.</p>
                ) : (
                  <WithdrawRegistration contest={contest} onWithdraw={withdraw} />
                )
              )}
            </div>
            {slug === "execute-26-4" && (
              <aside className="profile-panel execute-seating-panel" aria-live="polite">
                <h2>Seating Plan</h2>
                <dl className="summary-list">
                  <dt>Team Name</dt><dd>{registration.seatingPlan?.teamName || registration.teamName || "—"}</dd>
                  <dt>Hall Name</dt><dd>{registration.seatingPlan?.hallName || "—"}</dd>
                  <dt>Lab Number</dt><dd>{registration.seatingPlan?.labNumber || "—"}</dd>
                  <dt>System Number</dt><dd>{registration.seatingPlan?.systemNumber || "—"}</dd>
                </dl>
                {(registration.seatingPlan?.message || (!registration.seatingPlan ? EXECUTE_SEATING_PLACEHOLDER : null)) && (
                  <p className="panel-help">{registration.seatingPlan?.message || EXECUTE_SEATING_PLACEHOLDER}</p>
                )}
              </aside>
            )}
            </div>
          );
        }

        if (isPast) {
          return null;
        }

        if (contest.registrationStatus === "SOON") {
          return (
            <div className="profile-panel">
              <span className="status-pill is-soon">Registrations Opening Soon</span>
              <p className="panel-help">Registration hasn’t opened yet. Check back soon.</p>
            </div>
          );
        }

        if (contest.registrationStatus === "CLOSED") {
          return (
            <div className="profile-panel">
              <span className="status-pill is-closed">Registration closed</span>
              <p className="panel-help">Registration for this contest has closed.</p>
            </div>
          );
        }

        return (
          <div className="profile-panel">
            {contest.mandatory && <span className="status-pill is-mandatory registration-mandatory-badge">MANDATORY · Registration required</span>}
            {contest.participationType === "TEAM" || slug === "execute-26-4" ? (
              <TeamRegistrationForm account={account} contest={contest} onSubmit={registerTeam} />
            ) : (
              <ContestRegistrationForm account={account} onSubmit={register} />
            )}
          </div>
        );
      })()}

      {/* Official Leaderboard for Ended Contests */}
      {isPast && state.detail.leaderboard && (
        <ContestLeaderboardView
          leaderboard={state.detail.leaderboard}
          account={account}
          isAdmin={account.role === "ADMIN"}
          onDeleteLeaderboard={async () => {
            await api(`/api/admin/contests/${encodeURIComponent(slug)}/leaderboard`, { method: "DELETE" });
            setState((current) => (current.detail ? { ...current, detail: { ...current.detail, leaderboard: null } } : current));
          }}
        />
      )}

      {/* Admin Notice when no Leaderboard has been uploaded for a Past Contest */}
      {isPast && !state.detail.leaderboard && account.role === "ADMIN" && (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/40 p-5 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            No official standings have been published yet for this concluded contest.
          </p>
          <Link
            href="/dashboard/admin"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] shadow-sm hover:border-[var(--accent)]"
          >
            Upload Leaderboard JSON in Admin Center &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
