// "Date to be announced" until an organizer sets starts_at in the database.
export function formatContestDate(startsAt: string | null) {
  if (!startsAt) return "Date to be announced";
  return new Date(startsAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
