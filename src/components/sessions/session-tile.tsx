import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Hourglass, MapPin } from "lucide-react";
import { contestBadge, formatContestWhen, formatRegistrationDeadline } from "@/lib/contest-format";
import type { SessionSummary } from "@/types/session";

const badgeIcon = (registered: boolean) => (registered ? <Check size={13} aria-hidden="true" /> : null);
// Only worth showing while people can still register and have not yet (and only when an organizer set a deadline).
const showDeadline = (session: SessionSummary) => session.registrationStatus === "OPEN" && !session.registration && session.registrationClosesAt;

// One session as a card on the Sessions page.
export function SessionCard({ session }: { session: SessionSummary }) {
  const registered = Boolean(session.registration);
  const badge = contestBadge(session, registered);
  return (
    <Link href={`/dashboard/sessions/${session.slug}`} className="contest-card">
      <span className={`status-pill is-${badge.tone}`}>
        {badgeIcon(registered)}
        {badge.label}
      </span>
      <h2>{session.title}</h2>
      <p>{session.description}</p>
      {session.venue && (
        <span className="contest-meta">
          <MapPin size={15} aria-hidden="true" /> Venue: {session.venue}
        </span>
      )}
      {showDeadline(session) && (
        <span className="contest-meta contest-deadline">
          <Hourglass size={15} aria-hidden="true" /> {formatRegistrationDeadline(session.registrationClosesAt as string)}
        </span>
      )}
      <div className="contest-card-footer">
        <span className="contest-meta">
          <CalendarClock size={15} aria-hidden="true" /> {formatContestWhen(session.startsAt, session.endsAt)}
        </span>
        <span className="contest-card-cta">
          {registered ? "View registration" : session.registrationStatus === "OPEN" ? "View & register" : "View details"} <ArrowRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

// One session as a tile on the dashboard.
export function SessionHighlight({ session }: { session: SessionSummary }) {
  const registered = Boolean(session.registration);
  const badge = contestBadge(session, registered);
  const canRegister = session.registrationStatus === "OPEN" && !registered;
  return (
    <section className="profile-panel contest-highlight" aria-label={session.title}>
      <div className="contest-highlight-header">
        <h2>{session.title}</h2>
        <span className={`status-pill is-${badge.tone}`}>
          {badgeIcon(registered)}
          {badge.label}
        </span>
      </div>
      <div className="contest-highlight-meta">
        <span>
          <CalendarClock size={15} aria-hidden="true" /> {formatContestWhen(session.startsAt, session.endsAt)}
        </span>
      </div>
      {session.venue && (
        <div className="contest-highlight-meta">
          <span>
            <MapPin size={15} aria-hidden="true" /> Venue: {session.venue}
          </span>
        </div>
      )}
      {showDeadline(session) && (
        <div className="contest-highlight-meta contest-deadline">
          <span>
            <Hourglass size={15} aria-hidden="true" /> {formatRegistrationDeadline(session.registrationClosesAt as string)}
          </span>
        </div>
      )}
      <Link href={`/dashboard/sessions/${session.slug}`} className={`button ${canRegister ? "button-primary" : "button-secondary"} contest-highlight-cta`}>
        {canRegister ? "Register Now" : registered ? "View registration" : "View details"}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
