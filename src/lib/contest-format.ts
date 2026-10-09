import type { Contest } from "@/types/contest";

// Every contest time is shown in Indian time, whatever time zone the visitor's device is set to.
const TIME_ZONE = "Asia/Kolkata";
const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "long", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = (iso: string) => dayFormat.format(new Date(iso));
const time = (iso: string) => timeFormat.format(new Date(iso));

// "24 October 2026 · 14:00 – 16:00 IST"   (or "Date to be announced" until an organizer sets starts_at)
export function formatContestWhen(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return "Date to be announced";
  if (!endsAt) return `${day(startsAt)} · ${time(startsAt)} IST`;
  if (day(startsAt) === day(endsAt)) return `${day(startsAt)} · ${time(startsAt)} – ${time(endsAt)} IST`;
  return `${day(startsAt)} ${time(startsAt)} – ${day(endsAt)} ${time(endsAt)} IST`;
}

// "Registration closes 14:15 on 24 October 2026"
export function formatRegistrationDeadline(closesAt: string) {
  return `Registration closes ${time(closesAt)} on ${day(closesAt)}`;
}

// A moment such as "Registered on": "24 Oct 2026, 2:15 pm"
export function formatContestDate(iso: string | null) {
  if (!iso) return "Date to be announced";
  return new Date(iso).toLocaleString("en-IN", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// The coloured label on a contest. `tone` picks the colour (.status-pill.is-<tone> in globals.css).
export function contestBadge(contest: Contest, registered: boolean): { label: string; tone: "done" | "open" | "soon" | "closed" } {
  if (registered) return { label: "Registered", tone: "done" };
  if (contest.registrationStatus === "SOON") return { label: "Registrations Opening Soon", tone: "soon" };
  if (contest.registrationStatus === "OPEN") return { label: "Registration open", tone: "open" };
  return { label: "Registration closed", tone: "closed" };
}

// "Upcoming" = has not finished yet (a contest that is on right now counts). If no end time is set we use the start time;
// a contest with no dates at all ("Date to be announced") is still to come.
export function isUpcoming(contest: Contest, now: Date = new Date()) {
  const last = contest.endsAt ?? contest.startsAt;
  return last === null || new Date(last).getTime() > now.getTime();
}
