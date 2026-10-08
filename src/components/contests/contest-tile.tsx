import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Hourglass } from "lucide-react";
import { contestBadge, formatContestWhen, formatRegistrationDeadline } from "@/lib/contest-format";
import type { ContestSummary } from "@/types/contest";

const badgeIcon = (registered: boolean) => (registered ? <Check size={13} aria-hidden="true" /> : null);
// Only worth showing while people can still register and have not yet.
const showDeadline = (contest: ContestSummary) => contest.registrationStatus === "OPEN" && !contest.registration && contest.registrationClosesAt;

// One contest as a card on the Contests page.
export function ContestCard({ contest }: { contest: ContestSummary }) {
  const registered = Boolean(contest.registration);
  const badge = contestBadge(contest, registered);
  return (
    <Link href={`/dashboard/contests/${contest.slug}`} className="contest-card">
      <span className={`status-pill is-${badge.tone}`}>
        {badgeIcon(registered)}
        {badge.label}
      </span>
      <h2>{contest.title}</h2>
      <p>{contest.description}</p>
      {showDeadline(contest) && (
        <span className="contest-meta contest-deadline">
          <Hourglass size={15} aria-hidden="true" /> {formatRegistrationDeadline(contest.registrationClosesAt as string)}
        </span>
      )}
      <div className="contest-card-footer">
        <span className="contest-meta">
          <CalendarClock size={15} aria-hidden="true" /> {formatContestWhen(contest.startsAt, contest.endsAt)}
        </span>
        <span className="contest-card-cta">
          {registered ? "View registration" : contest.registrationStatus === "OPEN" ? "View & register" : "View details"} <ArrowRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

// One contest as a tile on the dashboard.
export function ContestHighlight({ contest }: { contest: ContestSummary }) {
  const registered = Boolean(contest.registration);
  const badge = contestBadge(contest, registered);
  const canRegister = contest.registrationStatus === "OPEN" && !registered;
  return (
    <section className="profile-panel contest-highlight" aria-label={contest.title}>
      <div className="contest-highlight-header">
        <h2>{contest.title}</h2>
        <span className={`status-pill is-${badge.tone}`}>
          {badgeIcon(registered)}
          {badge.label}
        </span>
      </div>
      <div className="contest-highlight-meta">
        <span>
          <CalendarClock size={15} aria-hidden="true" /> {formatContestWhen(contest.startsAt, contest.endsAt)}
        </span>
      </div>
      {showDeadline(contest) && (
        <div className="contest-highlight-meta contest-deadline">
          <span>
            <Hourglass size={15} aria-hidden="true" /> {formatRegistrationDeadline(contest.registrationClosesAt as string)}
          </span>
        </div>
      )}
      <Link href={`/dashboard/contests/${contest.slug}`} className={`button ${canRegister ? "button-primary" : "button-secondary"} contest-highlight-cta`}>
        {canRegister ? "Register Now" : registered ? "View registration" : "View details"}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
