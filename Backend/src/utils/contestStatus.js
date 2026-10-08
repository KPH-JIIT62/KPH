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

module.exports = { registrationStatus };
