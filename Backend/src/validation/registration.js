// Contest registration form. Only teamName and hackerrankHandle are read from the request.
// Name, enrollment number, batch and branch are NOT accepted from the client: the server reads them
// from the person's saved profile, so nobody can register under someone else's details.
const TEAM_NAME = /^[A-Za-z0-9][A-Za-z0-9 _.&'-]{1,39}$/;
const HANDLE = /^[A-Za-z0-9_.-]{1,40}$/;

function validateRegistration(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const fields = {};
  const text = (name) => (typeof input[name] === "string" ? input[name].trim() : "");

  const teamName = text("teamName").replace(/\s+/g, " ");
  if (!teamName) fields.teamName = "Please enter your team name.";
  else if (!TEAM_NAME.test(teamName)) fields.teamName = "Team name should be 2–40 characters: letters, digits, spaces and _ . & ' -";

  const hackerrankHandle = text("hackerrankHandle");
  if (!hackerrankHandle) fields.hackerrankHandle = "Your HackerRank ID is required.";
  else if (!HANDLE.test(hackerrankHandle)) fields.hackerrankHandle = "HackerRank username should be letters, digits, _ . or -.";

  return { value: { teamName, hackerrankHandle }, fields, ok: Object.keys(fields).length === 0 };
}

module.exports = { validateRegistration };
