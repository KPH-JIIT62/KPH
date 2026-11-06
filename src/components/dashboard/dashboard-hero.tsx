"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarX2, Check, Hourglass, MapPin } from "lucide-react";
import { useAccount } from "@/components/account-provider";
import {
  cleanVenue,
  formatContestWhen,
  formatRegistrationDeadline,
  formatRegistrationWindow,
  isUpcoming,
} from "@/lib/contest-format";
import type { ContestSummary } from "@/types/contest";
import type { SessionSummary } from "@/types/session";

interface DashboardHeroProps {
  contests: ContestSummary[];
  sessions: SessionSummary[];
}

type UpcomingItem =
  | { type: "contest"; data: ContestSummary }
  | { type: "session"; data: SessionSummary };

export function DashboardHero({ contests, sessions }: DashboardHeroProps) {
  const { account } = useAccount();

  // User first name
  const firstName = account?.displayName
    ? account.displayName.trim().split(/\s+/)[0]
    : "there";

  // Find all upcoming contests from DB
  const upcomingContests = (contests || []).filter((c) => isUpcoming(c));

  // Find all upcoming sessions from DB
  const upcomingSessions = (sessions || []).filter((s) => isUpcoming(s));

  // Combine all upcoming events
  const allEvents: UpcomingItem[] = [
    ...upcomingContests.map((c) => ({ type: "contest" as const, data: c })),
    ...upcomingSessions.map((s) => ({ type: "session" as const, data: s })),
  ];

  // Sort by startsAt ascending (soonest first)
  allEvents.sort((a, b) => {
    const timeA = a.data.startsAt ? new Date(a.data.startsAt).getTime() : Infinity;
    const timeB = b.data.startsAt ? new Date(b.data.startsAt).getTime() : Infinity;
    return timeA - timeB;
  });

  return (
    <div className="relative  w-full rounded-3xl overflow-hidden border border-[var(--border)] shadow-xl min-h-[520px] lg:min-h-[580px] flex items-center p-6 sm:p-10 lg:p-12 transition-all">
      {/* 1. Full Hero Background Image (Natural right alignment, showcasing workspace & poster) */}
      <img
        src="/images/dashboard/hero-desk.jpg"
        alt="Code Compete Grow Workspace"
        className="absolute inset-0 size-full object-cover object-right select-none pointer-events-none"
        loading="eager"
        draggable={false}
      />

      {/* 2. Left-Side Progressive Frosted Blur (softens left background for text clarity, keeps right laptop sharp) */}
      <div
        className="absolute inset-y-0 left-0 w-full md:w-3/5 lg:w-[62%] backdrop-blur-md md:backdrop-blur-lg [mask-image:linear-gradient(to_right,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_50%,transparent_100%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Soft Ambient Color Overlay: Translucent on left (not wholly white), smoothly transitioning to transparent */}
      {/* Desktop / Tablet horizontal transition */}
      <div
        className="absolute inset-0 hidden md:block bg-gradient-to-r from-[var(--surface)]/70 via-[var(--surface)]/45 via-45% to-transparent to-75% pointer-events-none"
        aria-hidden="true"
      />

      {/* Mobile vertical transition */}
      <div
        className="absolute inset-0 md:hidden bg-gradient-to-b from-[var(--surface)]/75 via-[var(--surface)]/50 via-65% to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle Dark Mode Eye-Comfort Tint */}
      <div
        className="absolute inset-0 hidden dark:block bg-black/30 pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Hero Content Layer */}
      <div className="relative z-10 w-full flex flex-col justify-center">
        {/* Eyebrow Label */}
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
         
        </span>

        {/* Heading with Brand Accent Dot */}
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[var(--text)] leading-tight mt-1.5">
          Hey there, {firstName}
          <span className="text-[var(--accent)] font-bold">.</span>
        </h1>

        {/* Slogan */}
        <h2 className="text-xl sm:text-2xl lg:text-[28px] font-extrabold tracking-tight text-[var(--text)] mt-1.5">
          Code Today, <span className="text-emerald-800">Grow Tomorrow.</span> 
        </h2>

        {/* Subtitle / Mission */}
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2.5 max-w-lg leading-relaxed font-normal">
          Keep solving. Keep learning. Keep leveling up. Here&apos;s what&apos;s coming up at KPH.
        </p>

        {/* 4. Upcoming Events Section */}
        <div className="mt-6 sm:mt-8 w-full">
          {/* Upcoming Event Title Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text)]">
              Upcoming Events
            </h3>
            {allEvents.length > 0 && (
              <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                {allEvents.length}
              </span>
            )}
          </div>

          {/* If No Upcoming Events */}
          {allEvents.length === 0 ? (
            <div className="w-full max-w-[420px] rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/45 dark:bg-[#141416]/55 backdrop-blur-md p-5 shadow-lg text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                <CalendarX2 size={20} />
              </div>
              <h4 className="text-base font-bold text-[var(--text)]">No upcoming events</h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                There are no active events scheduled right now. Check back soon for new contests and sessions!
              </p>
            </div>
          ) : (
            /* List of All Upcoming Events: Always stacked vertically on the left below previous ones */
            <div className="w-full max-w-[420px] flex flex-col gap-3.5">
              {allEvents.map((item) => {
                if (item.type === "contest") {
                  const contest = item.data;
                  const registered = Boolean(contest.registration);
                  const venueDisplay = cleanVenue(contest.venue);
                  const showDeadline = Boolean(contest.registrationClosesAt);
                  const registrationWindowText = contest.registrationStartsAt
                    ? formatRegistrationWindow(
                        contest.registrationStartsAt,
                        contest.registrationClosesAt
                      )
                    : contest.registrationClosesAt
                    ? formatRegistrationDeadline(contest.registrationClosesAt)
                    : "Registration open";

                  return (
                    <Link
                      key={contest.id || contest.slug}
                      href={`/dashboard/contests/${contest.slug}`}
                      className="group block rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/45 dark:bg-[#141416]/55 backdrop-blur-md p-4 sm:p-5 shadow-lg transition-all hover:border-[var(--accent)] hover:bg-[var(--surface)]/60 dark:hover:bg-[#141416]/70 hover:shadow-xl"
                    >
                      {/* Event Title */}
                      <h4 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                        {contest.title}
                      </h4>

                      {/* Registration Window */}
                      {showDeadline && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                          <Hourglass size={14} className="shrink-0 text-[var(--accent)]" />
                          <span>{registrationWindowText}</span>
                        </div>
                      )}

                      {/* Divider Line */}
                      <div className="my-3 border-t border-[var(--border)]/70" />

                      {/* Bottom Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1.5">
                            <CalendarClock size={14} className="shrink-0" />
                            <span>{formatContestWhen(contest.startsAt, contest.endsAt)}</span>
                          </div>
                          {venueDisplay && (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={14} className="shrink-0" />
                              <span>Venue: {venueDisplay}</span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 pt-1 sm:pt-0">
                          {registered ? (
                            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 dark:text-white">
                              <Check size={16} strokeWidth={2.5} className="shrink-0 text-emerald-800 dark:text-white" />
                              <span>Registered</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-800 group-hover:underline">
                              <span>View & register</span>
                              <ArrowRight size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                }

                /* Session Item */
                const session = item.data;
                const registered = Boolean(session.registration);
                const venueDisplay = cleanVenue(session.venue);

                return (
                  <Link
                    key={session.id || session.slug}
                    href={`/dashboard/sessions/${session.slug}`}
                    className="group block rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/45 dark:bg-[#141416]/55 backdrop-blur-md p-4 sm:p-5 shadow-lg transition-all hover:border-[var(--accent)] hover:bg-[var(--surface)]/60 dark:hover:bg-[#141416]/70 hover:shadow-xl"
                  >
                    {/* Session Title */}
                    <h4 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                      {session.title}
                    </h4>

                    {/* Divider Line */}
                    <div className="my-3 border-t border-[var(--border)]/70" />

                    {/* Bottom Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock size={14} className="shrink-0" />
                          <span>{formatContestWhen(session.startsAt, session.endsAt)}</span>
                        </div>
                        {venueDisplay && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="shrink-0" />
                            <span>Venue: {venueDisplay}</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 pt-1 sm:pt-0">
                        {registered ? (
                          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 dark:text-white">
                            <Check size={16} strokeWidth={2.5} className="shrink-0 text-emerald-800 dark:text-white" />
                            <span>Registered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-800 group-hover:underline">
                            <span>View & register</span>
                            <ArrowRight size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
