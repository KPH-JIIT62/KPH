// For JIIT accounts the part before the "@" IS the enrollment number, e.g. 9921103001@mail.jiit.ac.in.
// We take it from the VERIFIED email on the server, so a student cannot claim someone else's number.
// Staff-style addresses (prof.sharma@...) have no number; those users are asked to type it.
function enrollmentFromEmail(email) {
  const localPart = String(email || "").split("@")[0];
  return /^\d{5,20}$/.test(localPart) ? localPart : null;
}

module.exports = { enrollmentFromEmail };
