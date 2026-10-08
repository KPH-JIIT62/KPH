// Validation = never trust what arrives in the request body.
// We read ONLY the fields we expect (a whitelist). Anything else the client sends,
// such as { role: "ADMIN" }, is simply ignored and can never reach the database.
//
// "branch" and "yearOfStudy" are deliberately NOT in the whitelist: they are worked out by the server
// from the enrollment number + batch (see userService.prepareProfileUpdate), so a client cannot set them.
// This file only checks the SHAPE of what was typed; the campus / batch / branch rules live in utils/academic.js.

const clean = (text) => text.replace(/\s+/g, " ");
const RULES = {
  enrollmentNo: { pattern: /^[A-Za-z0-9]{5,20}$/, message: "Enrollment number should be 5–20 letters or digits.", format: (t) => t.toUpperCase() },
  batch: { pattern: /^[A-Za-z0-9-]{1,10}$/, message: "Enter your batch letter and number, e.g. B11.", format: (t) => t.toUpperCase() },
  codeforcesHandle: { pattern: /^[A-Za-z0-9_.-]{3,24}$/, message: "Codeforces handle should be 3–24 characters (letters, digits, _ . -)." },
  leetcodeHandle: { pattern: /^[A-Za-z0-9_-]{1,40}$/, message: "LeetCode username should be letters, digits, _ or -." },
  codechefHandle: { pattern: /^[A-Za-z0-9_.-]{1,40}$/, message: "CodeChef username should be letters, digits, _ . or -." },
  hackerrankHandle: { pattern: /^[A-Za-z0-9_.-]{1,40}$/, message: "HackerRank username should be letters, digits, _ . or -." },
};

// enrollmentFixed = the server already knows this user's enrollment number (taken from their email),
// so whatever the client sends for it is ignored.
function validateProfile(body, { enrollmentFixed = false } = {}) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const required = enrollmentFixed ? ["batch"] : ["batch", "enrollmentNo"];
  const value = {};
  const fields = {};

  for (const [name, rule] of Object.entries(RULES)) {
    if (name === "enrollmentNo" && enrollmentFixed) {
      value.enrollmentNo = null; // the saved value is kept as it is (see userService.updateProfile)
      continue;
    }
    const raw = input[name];
    // An optional field that was not sent at all (the onboarding form sends no handles) is left untouched.
    // One that was sent empty ("") means "clear it".
    if (raw === undefined && !required.includes(name)) continue;
    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      fields[name] = "Must be text.";
      continue;
    }
    let text = (raw ?? "").trim();
    if (text === "") {
      if (required.includes(name)) fields[name] = "This field is required.";
      value[name] = null; // an empty optional field is stored as NULL, not as ""
      continue;
    }
    if (rule.format) text = rule.format(text);
    if (!rule.pattern.test(text)) fields[name] = rule.message;
    value[name] = text;
  }

  return { value, fields, ok: Object.keys(fields).length === 0 };
}

module.exports = { validateProfile };
