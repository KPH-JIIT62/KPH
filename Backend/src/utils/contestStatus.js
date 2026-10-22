// Can people register for this contest right now?  One answer for the whole app:
//   "SOON"   not open yet            "OPEN"   people can register            "CLOSED"  too late / switched off
//
// registration_status is the switch an organizer controls; registration_closes_at is a deadline that
// closes registration by itself, to the minute. `now` is passed in so tests can pretend it is any time.
function registrationStatus(row, now = new Date()) {
  if (row.registration_status === "SOON") return "SOON";
  if (row.registration_status === "CLOSED") return "CLOSED";
  if (row.registration_closes_at && now >= new Date(row.registration_closes_at)) return "CLOSED";
  return "OPEN";
}

// A registered person may withdraw until this many minutes before the contest starts.
const WITHDRAWAL_CUTOFF_MINUTES = 15;
const EXECUTE_WITHDRAWAL_CUTOFF = new Date("2026-10-31T13:45:00+05:30");

// The moment withdrawing stops being possible, or null while the contest has no start time yet.
function withdrawalDeadline(row) {
  if (!row.starts_at) return null;
  return new Date(new Date(row.starts_at).getTime() - WITHDRAWAL_CUTOFF_MINUTES * 60 * 1000);
}

// Withdrawing is allowed up to (not including) the deadline. It does not depend on whether registration is
// still open: someone who registered can always step back, as long as it is early enough.
function withdrawalOpen(row, now = new Date()) {
  const deadline = withdrawalDeadline(row);
  return deadline === null || now < deadline;
}

module.exports = { registrationStatus, WITHDRAWAL_CUTOFF_MINUTES, withdrawalDeadline, withdrawalOpen, EXECUTE_WITHDRAWAL_CUTOFF };
