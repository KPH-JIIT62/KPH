// Contest registration form. The only value that is STORED from the request is hackerrankHandle.
// Name, enrollment number, batch, branch and Year of Study are NOT accepted from the client: the server reads them
// from the person's saved profile, so nobody can register under someone else's details.
//
// If a client sends a "yearOfStudy" anyway, we do not use it. We only remember it so the service can REJECT the
// request when it differs from the Year of Study on the person's profile (a modified frontend, or a stale page).
const HANDLE = /^[A-Za-z0-9_.-]{1,40}$/;

function validateRegistration(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const fields = {};
  const text = (name) => (typeof input[name] === "string" ? input[name].trim() : "");

  const hackerrankHandle = text("hackerrankHandle");
  if (!hackerrankHandle) fields.hackerrankHandle = "Your HackerRank ID is required.";
  else if (!HANDLE.test(hackerrankHandle)) fields.hackerrankHandle = "HackerRank username should be letters, digits, _ . or -.";

  return { value: { hackerrankHandle, claimedYearOfStudy: input.yearOfStudy }, fields, ok: Object.keys(fields).length === 0 };
}

module.exports = { validateRegistration };
