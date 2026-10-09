// Run with:  TEST_DATABASE_URL=postgres://user:pass@localhost:5432/kph_test npm test
// WARNING: these tests EMPTY the users table, so they refuse to run unless the database name contains "test".
const { test, before, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createPool } = require("../src/db/pool");
const { createApp } = require("../src/app");
const { migrate } = require("../scripts/migrate");
const { createFirebaseVerifier } = require("../src/config/firebase");

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log("Skipping API tests: set TEST_DATABASE_URL to a *_test database.");
  process.exit(0);
}
if (!/test/i.test(new URL(url).pathname)) throw new Error("TEST_DATABASE_URL must point at a database whose name contains 'test'.");

const env = { allowedEmailDomain: "mail.jiit.ac.in", corsOrigins: ["http://localhost:3000"] };
const google = { sign_in_provider: "google.com" };
// Fake "Firebase": a token is just a key into this table. Unknown tokens are rejected like forged ones.
// Enrollment numbers (the part before the @) follow the real rules: Campus 62 = YY + 8 digits, Campus 128 = 99 + YY + 8 digits.
const TOKENS = {
  alice: { uid: "uid-alice", email: "2501030001@mail.jiit.ac.in", email_verified: true, name: "Alice A", firebase: google }, // campus 62, admitted 2025
  bob: { uid: "uid-bob", email: "992501030002@mail.jiit.ac.in", email_verified: true, name: "Bob B", firebase: google }, // campus 128, admitted 2025
  shrey: { uid: "uid-shrey", email: "2501030069@mail.jiit.ac.in", email_verified: true, name: "SHREYANSH SRIVASTAVA 2501030069", firebase: google },
  fresher: { uid: "uid-fresher", email: "2601030010@mail.jiit.ac.in", email_verified: true, name: "Fresh Er", firebase: google }, // campus 62, admitted 2026
  fresher128: { uid: "uid-fresher128", email: "992601030011@mail.jiit.ac.in", email_verified: true, name: "Fresh Er128", firebase: google }, // campus 128, admitted 2026
  senior: { uid: "uid-senior", email: "2401030012@mail.jiit.ac.in", email_verified: true, name: "Sen Ior", firebase: google }, // campus 62, admitted 2024
  legacy: { uid: "uid-legacy", email: "9921103001@mail.jiit.ac.in", email_verified: true, name: "Leg Acy", firebase: google }, // old 10-digit "99…" number: no longer a recognised format
  abc: { uid: "uid-abc", email: "abc.xyz@mail.jiit.ac.in", email_verified: true, name: "Abc Xyz", firebase: google }, // a college address that is not an enrollment number
  staff: { uid: "uid-staff", email: "prof.sharma@mail.jiit.ac.in", email_verified: true, name: "Prof Sharma", firebase: google },
  gmail: { uid: "uid-g", email: "someone@gmail.com", email_verified: true, name: "G", firebase: google },
  lookalike: { uid: "uid-l", email: "x@mail.jiit.ac.in.evil.com", email_verified: true, name: "L", firebase: google },
  unverified: { uid: "uid-u", email: "9921103009@mail.jiit.ac.in", email_verified: false, name: "U", firebase: google },
  password: { uid: "uid-p", email: "9921103008@mail.jiit.ac.in", email_verified: true, name: "P", firebase: { sign_in_provider: "password" } },
};
const verifyToken = async (token) => {
  if (!TOKENS[token]) throw new Error("bad token");
  return TOKENS[token];
};
// The app's clock. Fixed (after the July 20, 2026 rollover) so Year of Study is predictable: tests move it to check rollovers.
const DEFAULT_NOW = "2026-10-08T12:00:00+05:30";
let nowValue = new Date(DEFAULT_NOW);
const now = () => nowValue;

let pool, server, base;
const call = (method, path, { token, body, headers = {} } = {}) =>
  fetch(base + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
// enrollmentNo is deliberately absent: for alice it comes from her email address. Branch is absent too: the server works it out.
const validProfile = { batch: "b10", codeforcesHandle: "alice_cf", codechefHandle: "alice_cc", leetcodeHandle: "", hackerrankHandle: "  " };
const countUsers = async () => Number((await pool.query("SELECT count(*) FROM users")).rows[0].count);
const me = async (token) => (await (await call("GET", "/api/users/me", { token })).json()).user;

before(async () => {
  pool = createPool(url);
  await migrate(pool, () => {});
  server = createApp({ env, pool, verifyToken, now }).listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(async () => { server.close(); await pool.end(); });
beforeEach(() => {
  nowValue = new Date(DEFAULT_NOW);
  return pool.query("TRUNCATE users, core_team_members CASCADE");
}); // CASCADE also empties contest_registrations; contests (seeded by a migration) stay

describe("public + plumbing", () => {
  test("health is public", async () => assert.equal((await call("GET", "/api/health")).status, 200));
  test("unknown route -> 404 JSON in the standard error shape", async () => {
    const res = await call("GET", "/api/nope");
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, "NOT_FOUND");
  });
  test("CORS: allowed origin gets headers, other origins do not", async () => {
    const ok = await call("GET", "/api/health", { headers: { Origin: "http://localhost:3000" } });
    const bad = await call("GET", "/api/health", { headers: { Origin: "https://evil.example" } });
    assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:3000");
    assert.equal(bad.headers.get("access-control-allow-origin"), null);
  });
  test("CORS preflight (what a browser sends before PUT + Authorization) succeeds WITHOUT a token", async () => {
    const res = await call("OPTIONS", "/api/users/me/profile", {
      headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "authorization,content-type" },
    });
    assert.equal(res.status, 204);
    assert.match(res.headers.get("access-control-allow-methods"), /PUT/);
    assert.match(res.headers.get("access-control-allow-headers").toLowerCase(), /authorization/);
  });
  test("malformed JSON -> 400", async () => {
    const res = await call("PUT", "/api/users/me/profile", { token: "alice", body: "{not json" });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "INVALID_JSON");
  });
});

describe("authentication (who are you?)", () => {
  test("no token -> 401", async () => assert.equal((await call("GET", "/api/users/me")).status, 401));
  test("forged token -> 401", async () => {
    const res = await call("GET", "/api/users/me", { token: "forged" });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, "INVALID_TOKEN");
  });
  for (const [name, why] of [["gmail", "other domain"], ["lookalike", "look-alike domain"], ["unverified", "unverified email"], ["password", "non-Google sign-in"]]) {
    test(`rejected with 403 and NO user created: ${why}`, async () => {
      const res = await call("GET", "/api/users/me", { token: name });
      assert.equal(res.status, 403);
      assert.equal((await res.json()).error.code, "DOMAIN_NOT_ALLOWED");
      assert.equal(await countUsers(), 0);
    });
  }
  test("the real Firebase verifier rejects garbage tokens (wiring check)", async () => {
    const real = createFirebaseVerifier("kph-college");
    await assert.rejects(real("not-a-real-token"));
    const srv = createApp({ env, pool, verifyToken: real }).listen(0);
    const res = await fetch(`http://localhost:${srv.address().port}/api/users/me`, { headers: { Authorization: "Bearer not-a-real-token" } });
    srv.close();
    assert.equal(res.status, 401);
  });
  test("user identity cannot be spoofed with headers or query strings", async () => {
    await call("GET", "/api/users/me", { token: "bob" }); // bob exists
    const res = await call("GET", "/api/users/me?userId=bob&uid=uid-bob", { token: "alice", headers: { "x-user-id": "uid-bob" } });
    assert.equal((await res.json()).user.email, TOKENS.alice.email);
  });
});

describe("enrollment number from the email", () => {
  const { enrollmentFromEmail } = require("../src/utils/enrollment");
  const { cleanDisplayName } = require("../src/utils/displayName");
  test("digits-only local part is the enrollment number; anything else is not", () => {
    assert.equal(enrollmentFromEmail("9921103001@mail.jiit.ac.in"), "9921103001");
    assert.equal(enrollmentFromEmail("prof.sharma@mail.jiit.ac.in"), null);
    assert.equal(enrollmentFromEmail("1234@mail.jiit.ac.in"), null); // too short to be one
    assert.equal(enrollmentFromEmail(undefined), null);
  });
});

describe("display name cleaning", () => {
  const { cleanDisplayName } = require("../src/utils/displayName");
  test("strips the enrollment number and fixes ALL CAPS", () => {
    assert.equal(cleanDisplayName("SHREYANSH SRIVASTAVA 2501030069", "x@y.z"), "Shreyansh Srivastava");
    assert.equal(cleanDisplayName("2501030069 ASHA VERMA", "x@y.z"), "Asha Verma");
    assert.equal(cleanDisplayName("asha verma", "x@y.z"), "Asha Verma");
    assert.equal(cleanDisplayName("ANNA-MARIE O'NEIL", "x@y.z"), "Anna-Marie O'Neil");
  });
  test("leaves mixed-case names alone, removes only long numbers", () => {
    assert.equal(cleanDisplayName("Asha Verma 9921103001", "x@y.z"), "Asha Verma");
    assert.equal(cleanDisplayName("Ravi McDonald", "x@y.z"), "Ravi McDonald");
    assert.equal(cleanDisplayName("Agent 007", "x@y.z"), "Agent 007");
  });
  test("falls back to the email when nothing is left", () => {
    assert.equal(cleanDisplayName("9921103001", "prof.sharma@mail.jiit.ac.in"), "Prof Sharma");
    assert.equal(cleanDisplayName("", "prof.sharma@mail.jiit.ac.in"), "Prof Sharma");
    assert.equal(cleanDisplayName("", "9921103001@mail.jiit.ac.in"), "9921103001");
    assert.equal(cleanDisplayName(undefined, "asha@mail.jiit.ac.in"), "Asha");
  });
});

describe("academic detection (pure rules, config-driven)", () => {
  const academic = require("../src/utils/academic");
  const { BATCH_BRANCHES, CAMPUSES, MAX_YEAR_OF_STUDY } = require("../src/config/academic");
  const at = (iso) => new Date(iso);
  const NOW = at(DEFAULT_NOW);

  test("campus + admission year come from BOTH enrollment formats (general rule, not just the examples)", () => {
    assert.deepEqual(academic.parseEnrollment("2601030069"), { ok: true, campus: "62", campusLabel: "Campus 62", admissionYear: 2026 });
    assert.deepEqual(academic.parseEnrollment("2401030069"), { ok: true, campus: "62", campusLabel: "Campus 62", admissionYear: 2024 });
    assert.deepEqual(academic.parseEnrollment("992601030069"), { ok: true, campus: "128", campusLabel: "Campus 128", admissionYear: 2026 });
    assert.deepEqual(academic.parseEnrollment("992301030999"), { ok: true, campus: "128", campusLabel: "Campus 128", admissionYear: 2023 });
    assert.equal(academic.parseEnrollment("  2501030069 ").admissionYear, 2025); // surrounding spaces are tolerated
  });
  test("unrecognised enrollment numbers are rejected with the support address in the message", () => {
    for (const bad of ["", "abc", "250103006", "25010300691", "99250103006", "9925010300691", "25O1030069", "2501-030069", undefined, null, 2501030069]) {
      const r = academic.parseEnrollment(bad);
      assert.equal(r.ok, false, `should reject ${JSON.stringify(bad)}`);
      assert.match(r.message, /kph\.jiit@gmail\.com/);
    }
  });
  test("an old 10-digit '99…' number is not accepted as campus 128 (campus 128 numbers have 12 digits)", () => {
    const r = academic.describeAcademic("9921103001", NOW);
    assert.equal(r.yearOfStudy, null);
    assert.match(r.error, /couldn’t recognise/);
  });
  test("Year of Study for admission 2026 / 2025 / 2024 (both campuses)", () => {
    for (const [no, year, label] of [["2601030069", 1, "1st Year"], ["2501030069", 2, "2nd Year"], ["2401030069", 3, "3rd Year"], ["992601030069", 1, "1st Year"], ["992501030069", 2, "2nd Year"], ["992401030069", 3, "3rd Year"], ["2301030069", 4, "4th Year"]]) {
      const r = academic.describeAcademic(no, NOW);
      assert.equal(r.yearOfStudy, year, no);
      assert.equal(r.yearOfStudyLabel, label, no);
    }
  });
  test("the academic year rolls over on July 20 (India time), not on January 1", () => {
    const year = (iso, admitted = 2025) => academic.yearOfStudyFor(admitted, at(iso)).yearOfStudy;
    assert.equal(year("2026-01-01T00:00:00+05:30"), 1); // new calendar year, still the 2025 academic year
    assert.equal(year("2026-07-19T23:59:59+05:30"), 1); // last second before the rollover
    assert.equal(year("2026-07-20T00:00:00+05:30"), 2); // first second after it
    assert.equal(year("2026-12-31T23:59:59+05:30"), 2);
    assert.equal(year("2027-07-19T12:00:00+05:30"), 2);
    assert.equal(year("2027-07-20T12:00:00+05:30"), 3);
    // a server running in UTC gets the same answer: 18:30 UTC on July 19 is midnight on July 20 in India
    assert.equal(year("2026-07-19T18:29:59Z"), 1);
    assert.equal(year("2026-07-19T18:30:00Z"), 2);
  });
  test("a first-year before July 20 is not valid yet; beyond the programme length is not recognised", () => {
    assert.equal(academic.yearOfStudyFor(2026, at("2026-06-01T12:00:00+05:30")).ok, false); // 2026 intake before its academic year starts
    assert.equal(academic.yearOfStudyFor(2026, at("2026-07-20T00:00:00+05:30")).yearOfStudy, 1);
    assert.equal(academic.yearOfStudyFor(2026 - MAX_YEAR_OF_STUDY + 1, at("2026-10-08T12:00:00+05:30")).yearOfStudy, MAX_YEAR_OF_STUDY); // admitted 2023 = 4th year
    assert.equal(academic.yearOfStudyFor(2026 - MAX_YEAR_OF_STUDY, at("2026-10-08T12:00:00+05:30")).ok, false); // admitted 2022 = 5th: outside
  });
  test("EVERY batch letter on EVERY campus in the config gives its configured branch (and only for the right campus)", () => {
    for (const [campus, letters] of Object.entries(BATCH_BRANCHES)) {
      for (const [letter, rule] of Object.entries(letters)) {
        const admissionYear = Math.max(2025, rule.fromAdmissionYear ?? 0);
        const enrollmentNo = campus === "62" ? `${String(admissionYear).slice(2)}01030001` : `99${String(admissionYear).slice(2)}01030001`;
        for (const batch of [letter, `${letter}1`, `${letter.toLowerCase()}11`]) {
          const r = academic.deriveAcademic({ enrollmentNo, batch, now: at("2026-10-08T12:00:00+05:30") });
          assert.equal(r.ok, true, `${campus}/${batch}: ${r.message}`);
          assert.equal(r.branch, rule.branch, `${campus}/${batch}`);
          assert.equal(r.campus, campus);
        }
      }
    }
    // the exact table from the requirements
    const table = { 62: { B: "CSE", A: "ECE", C: "BT", D: "R&AI", G: "M&C", H: "IT" }, 128: { H: "IT", F: "CSE", E: "ECM" } };
    for (const [campus, letters] of Object.entries(table)) {
      const enrollmentNo = campus === "62" ? "2601030001" : "992601030001"; // admitted 2026: every letter exists
      for (const [letter, branch] of Object.entries(letters)) assert.equal(academic.deriveAcademic({ enrollmentNo, batch: `${letter}9`, now: NOW }).branch, branch, `${campus}/${letter}`);
    }
    assert.deepEqual(Object.keys(CAMPUSES).sort(), ["128", "62"]);
  });
  test("a batch letter from the OTHER campus is rejected", () => {
    for (const [enrollmentNo, batch] of [["2501030001", "F1"], ["2501030001", "E1"], ["992501030001", "B1"], ["992501030001", "A1"], ["992501030001", "C1"], ["992501030001", "D1"], ["992501030001", "G1"]]) {
      const r = academic.deriveAcademic({ enrollmentNo, batch, now: NOW });
      assert.equal(r.ok, false, `${enrollmentNo}/${batch}`);
      assert.equal(r.field, "batch");
    }
  });
  test("H means IT on both campuses, but on campus 62 only from the 2026 intake", () => {
    assert.equal(academic.deriveAcademic({ enrollmentNo: "992501030001", batch: "H1", now: NOW }).branch, "IT"); // 128, admitted 2025
    assert.equal(academic.deriveAcademic({ enrollmentNo: "992401030001", batch: "H1", now: NOW }).branch, "IT"); // 128 has no start year
    assert.equal(academic.deriveAcademic({ enrollmentNo: "2601030001", batch: "H1", now: NOW }).branch, "IT"); // 62, admitted 2026
    for (const enrollmentNo of ["2501030001", "2401030001"]) {
      const r = academic.deriveAcademic({ enrollmentNo, batch: "H1", now: NOW }); // 62, admitted before 2026
      assert.equal(r.ok, false, enrollmentNo);
      assert.match(r.message, /isn’t available for students admitted/);
    }
    assert.deepEqual(academic.describeAcademic("2501030001", NOW).batchBranches, { B: "CSE", A: "ECE", C: "BT", D: "R&AI", G: "M&C" });
    assert.equal(academic.describeAcademic("2601030001", NOW).batchBranches.H, "IT");
  });
  test("batch format: one letter + optional 1-2 digit number; anything else is rejected", () => {
    assert.equal(academic.parseBatch(" b 11 ").batch, "B11");
    assert.equal(academic.parseBatch("B").batch, "B");
    for (const bad of ["", "11", "BB1", "B111", "B-1", "B1X", "💥", undefined, 5]) assert.equal(academic.parseBatch(bad).ok, false, JSON.stringify(bad));
  });
  test("a client-supplied Year of Study is compared in any sensible spelling", () => {
    for (const ok of [2, "2", "2nd", "2nd Year", "second", "Second Year", " SECOND YEAR "]) assert.equal(academic.yearInputMatches(ok, 2), true, JSON.stringify(ok));
    for (const bad of [3, "3", "third", "1st Year", null, undefined, {}, [], "", "two"]) assert.equal(academic.yearInputMatches(bad, 2), false, JSON.stringify(bad));
  });
});

describe("first login and onboarding data", () => {
  const me = async (token) => (await (await call("GET", "/api/users/me", { token })).json()).user;
  const put = (token, body) => call("PUT", "/api/users/me/profile", { token, body });

  test("first login creates a STUDENT, takes the enrollment number from the email, profile incomplete", async () => {
    const res = await call("GET", "/api/users/me", { token: "alice" });
    assert.equal(res.status, 200);
    const { user } = await res.json();
    assert.equal(user.role, "STUDENT");
    assert.equal(user.displayName, "Alice A"); // name comes from the Google account
    assert.equal(user.profile.enrollmentNo, "2501030001");
    assert.equal(user.profile.branch, null);
    assert.equal(user.profileCompleted, false);
    assert.equal(user.firebase_uid, undefined); // internal fields never leave the server
    assert.equal(await countUsers(), 1);
  });
  test("the API tells the form the campus, Year of Study and which batch letters this person may use", async () => {
    const { academic } = (await me("alice")).profile;
    assert.equal(academic.campus, "62");
    assert.equal(academic.campusLabel, "Campus 62");
    assert.equal(academic.admissionYear, 2025);
    assert.equal(academic.yearOfStudy, 2);
    assert.equal(academic.yearOfStudyLabel, "2nd Year");
    assert.equal(academic.error, null);
    assert.equal(academic.batchBranches.B, "CSE");
    assert.equal(academic.batchBranches.H, undefined); // campus 62 IT only from the 2026 intake
    const bob = (await me("bob")).profile.academic;
    assert.equal(bob.campus, "128");
    assert.deepEqual(bob.batchBranches, { H: "IT", F: "CSE", E: "ECM" });
  });
  test("the stored name is the cleaned Google name (no enrollment number, not shouting)", async () => {
    const user = await me("shrey");
    assert.equal(user.displayName, "Shreyansh Srivastava");
    assert.equal(user.profile.enrollmentNo, "2501030069");
  });
  test("the stored name follows later changes of the Google name", async () => {
    assert.equal((await me("alice")).displayName, "Alice A");
    TOKENS.alice.name = "ALICE RENAMED 2501030001";
    try {
      assert.equal((await me("alice")).displayName, "Alice Renamed");
      assert.equal((await pool.query("SELECT display_name FROM users")).rows[0].display_name, "Alice Renamed");
    } finally {
      TOKENS.alice.name = "Alice A";
    }
  });
  test("a staff-style address has no enrollment number yet, so nothing can be detected", async () => {
    const user = await me("staff");
    assert.equal(user.profile.enrollmentNo, null);
    assert.equal(user.profile.academic.campus, null);
    assert.equal(user.profile.academic.yearOfStudy, null);
  });
  test("5 simultaneous first requests still create exactly one user", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => call("GET", "/api/users/me", { token: "alice" })));
    assert.ok(results.every((r) => r.status === 200));
    assert.equal(await countUsers(), 1);
  });
  test("invalid profile -> 400 with per-field messages, nothing saved", async () => {
    const res = await put("alice", { batch: "", codeforcesHandle: "a b" });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.ok(error.fields.batch && error.fields.codeforcesHandle);
    assert.equal((await me("alice")).profileCompleted, false);
  });
  test("batch is required", async () => {
    const res = await put("alice", { codechefHandle: "alice_cc" });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error.fields.batch);
  });
  test("onboarding needs only a batch: branch and Year of Study are detected and saved", async () => {
    const res = await put("alice", { batch: "b10" });
    assert.equal(res.status, 200);
    const { user } = await res.json();
    assert.equal(user.profileCompleted, true);
    assert.equal(user.profile.batch, "B10");
    assert.equal(user.profile.branch, "CSE"); // campus 62 + B
    assert.equal(user.profile.academic.yearOfStudyLabel, "2nd Year");
    assert.equal(user.profile.codeforcesHandle, null);
  });
  test("branch follows campus + batch: campus 128 H = IT, campus 62 (2026 intake) H = IT, F = CSE", async () => {
    assert.equal((await (await put("bob", { batch: "H1" })).json()).user.profile.branch, "IT");
    assert.equal((await (await put("fresher", { batch: "h2" })).json()).user.profile.branch, "IT");
    assert.equal((await (await put("fresher128", { batch: "F3" })).json()).user.profile.branch, "CSE");
    assert.equal((await (await put("senior", { batch: "D4" })).json()).user.profile.branch, "R&AI");
  });
  test("a batch that does not exist, or belongs to the other campus, or is not open to your intake -> 400 on batch", async () => {
    for (const [token, batch] of [["alice", "Z9"], ["alice", "F1"], ["alice", "E1"], ["bob", "B1"], ["bob", "A1"], ["alice", "H1"], ["senior", "H1"], ["alice", "B111"], ["alice", "BB"], ["alice", "11"]]) {
      const res = await put(token, { batch });
      assert.equal(res.status, 400, `${token}/${batch}`);
      assert.ok((await res.json()).error.fields.batch, `${token}/${batch}`);
      assert.equal((await me(token)).profileCompleted, false, `${token}/${batch}`);
    }
  });
  test("the batch error message names the valid letters for the campus and the support address", async () => {
    const { error } = await (await put("bob", { batch: "B1" })).json();
    assert.match(error.fields.batch, /doesn’t exist on Campus 128/);
    assert.match(error.fields.batch, /H, F, E/);
    assert.match(error.fields.batch, /kph\.jiit@gmail\.com/);
  });
  test("a client cannot choose the branch: a branch in the request is ignored and the detected one is saved", async () => {
    const res = await put("alice", { batch: "B10", branch: "ECE" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.profile.branch, "CSE");
    assert.equal((await pool.query("SELECT branch FROM users")).rows[0].branch, "CSE");
  });
  test("a branch sent WITHOUT a valid batch cannot complete the profile either", async () => {
    const res = await put("alice", { branch: "CSE" });
    assert.equal(res.status, 400);
    assert.equal((await me("alice")).profileCompleted, false);
    assert.equal((await pool.query("SELECT branch FROM users")).rows[0].branch, null);
  });
  test("a client cannot set Year of Study: it is not stored anywhere and is derived from the enrollment number", async () => {
    await put("alice", { batch: "B10", yearOfStudy: 4, year: 4, yearOfStudyLabel: "4th Year", admissionYear: 2022, academic: { yearOfStudy: 4 } });
    const user = await me("alice");
    assert.equal(user.profile.academic.yearOfStudy, 2);
    assert.equal(user.profile.academic.admissionYear, 2025);
    const columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).rows.map((r) => r.column_name);
    assert.ok(!columns.some((c) => /year|campus|admission/i.test(c)), `users has a stored academic-year column: ${columns}`);
  });
  test("Year of Study is recomputed from the date on every request (nothing stale is stored)", async () => {
    await put("alice", { batch: "B10" }); // admitted 2025
    const year = async (iso) => {
      nowValue = new Date(iso);
      return (await me("alice")).profile.academic.yearOfStudy;
    };
    const before = (await pool.query("SELECT updated_at FROM users")).rows[0].updated_at.getTime();
    assert.equal(await year("2026-07-19T23:59:59+05:30"), 1);
    assert.equal(await year("2026-07-20T00:00:00+05:30"), 2);
    assert.equal(await year("2027-07-19T23:59:59+05:30"), 2);
    assert.equal(await year("2027-07-20T00:00:00+05:30"), 3);
    assert.equal(await year("2028-07-20T00:00:00+05:30"), 4);
    assert.equal(await year("2029-07-20T00:00:00+05:30"), null); // past the 4-year programme
    assert.equal((await pool.query("SELECT updated_at FROM users")).rows[0].updated_at.getTime(), before); // reading never writes
  });
  test("an enrollment number we cannot read blocks onboarding with a clear message (from the email, or typed)", async () => {
    let res = await put("legacy", { batch: "B10" }); // 9921103001 from the email
    assert.equal(res.status, 400);
    assert.match((await res.json()).error.fields.enrollmentNo, /kph\.jiit@gmail\.com/);
    res = await put("staff", { batch: "B10", enrollmentNo: "5500123" });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error.fields.enrollmentNo);
    assert.equal((await me("staff")).profileCompleted, false);
  });
  test("handles are optional: batch alone completes the profile", async () => {
    const res = await put("alice", { batch: "B10" });
    assert.equal(res.status, 200);
    const { user } = await res.json();
    assert.equal(user.profileCompleted, true);
    assert.equal(user.profile.codeforcesHandle, null);
  });
  test("handles that are NOT sent stay as they are; handles sent empty are cleared; a changed batch re-derives the branch", async () => {
    await put("alice", { batch: "B10", codeforcesHandle: "alice_cf", codechefHandle: "alice_cc" });
    // a later save that mentions no handles must not wipe them
    await put("alice", { batch: "B11" });
    let user = await me("alice");
    assert.equal(user.profile.batch, "B11");
    assert.equal(user.profile.branch, "CSE");
    assert.equal(user.profile.codeforcesHandle, "alice_cf");
    // sending a handle as "" clears just that one
    await put("alice", { batch: "B11", codeforcesHandle: "" });
    user = await me("alice");
    assert.equal(user.profile.codeforcesHandle, null);
    assert.equal(user.profile.codechefHandle, "alice_cc");
  });
  test("after onboarding, changing the batch re-derives the branch; branch/year in the request still do nothing", async () => {
    await put("fresher", { batch: "B1" });
    assert.equal((await me("fresher")).profile.branch, "CSE");
    const res = await put("fresher", { batch: "A1", branch: "BT", yearOfStudy: 3 });
    assert.equal(res.status, 200);
    const { user } = await res.json();
    assert.equal(user.profile.branch, "ECE"); // from batch A, not from the request
    assert.equal(user.profile.academic.yearOfStudy, 1);
    // an invalid batch on a completed profile is refused and nothing changes
    assert.equal((await put("fresher", { batch: "F1" })).status, 400);
    assert.equal((await me("fresher")).profile.branch, "ECE");
  });
  test("a completed profile cannot have its branch changed by sending the same batch with a different branch", async () => {
    await put("alice", { batch: "B10" });
    for (const body of [{ batch: "B10", branch: "ECE" }, { batch: "b10", branch: "" }, { batch: "B10", branch: { $set: "x" } }, { batch: "B10", branch: ["ECE"] }]) {
      const res = await put("alice", body);
      assert.equal(res.status, 200);
      assert.equal((await me("alice")).profile.branch, "CSE");
    }
  });
  test("a handle with bad characters is still rejected", async () => {
    const res = await put("alice", { batch: "B10", leetcodeHandle: "no spaces allowed" });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error.fields.leetcodeHandle);
  });
  test("valid profile is saved, normalised, and still there on the next login", async () => {
    const saved = await put("alice", validProfile);
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).user.profileCompleted, true);

    // "log in again" against a brand-new app instance (as after a server restart)
    const fresh = createApp({ env, pool, verifyToken, now }).listen(0);
    const again = await fetch(`http://localhost:${fresh.address().port}/api/users/me`, { headers: { Authorization: "Bearer alice" } });
    fresh.close();
    const { user } = await again.json();
    assert.equal(user.profileCompleted, true);
    const { academic, ...stored } = user.profile;
    assert.deepEqual(stored, {
      enrollmentNo: "2501030001", branch: "CSE", batch: "B10",
      codeforcesHandle: "alice_cf", leetcodeHandle: null, codechefHandle: "alice_cc", hackerrankHandle: null,
    });
    assert.equal(academic.yearOfStudyLabel, "2nd Year");
  });
  test("a client cannot override an enrollment number that came from the email", async () => {
    await put("alice", { ...validProfile, enrollmentNo: "2201030099" });
    assert.equal((await me("alice")).profile.enrollmentNo, "2501030001");
  });
  test("a user whose email has no number must type it, and it is locked after saving", async () => {
    const missing = await put("staff", validProfile);
    assert.equal(missing.status, 400);
    assert.ok((await missing.json()).error.fields.enrollmentNo);
    const saved = await put("staff", { ...validProfile, enrollmentNo: "2401030007" });
    assert.equal(saved.status, 200);
    const { user } = await saved.json();
    assert.equal(user.profile.academic.yearOfStudyLabel, "3rd Year"); // detected from what they typed
    await put("staff", { ...validProfile, enrollmentNo: "2401039999" });
    assert.equal((await me("staff")).profile.enrollmentNo, "2401030007");
  });
  test("mass assignment: sending role/id/email is ignored", async () => {
    await put("alice", { ...validProfile, role: "ADMIN", id: "x", email: "evil@x.com", profileCompleted: true });
    const user = await me("alice");
    assert.equal(user.role, "STUDENT");
    assert.equal(user.email, TOKENS.alice.email);
  });
  test("typing someone else's enrollment number -> 409", async () => {
    await call("GET", "/api/users/me", { token: "alice" }); // alice owns 2501030001 via her email
    const res = await put("staff", { ...validProfile, enrollmentNo: "2501030001" });
    assert.equal(res.status, 409);
    assert.ok((await res.json()).error.fields.enrollmentNo);
  });
  test("the database itself rejects a 'completed' profile with missing data", async () => {
    await call("GET", "/api/users/me", { token: "alice" }); // enrollment set, batch + branch missing
    await assert.rejects(pool.query("UPDATE users SET profile_completed_at = now()"), /completed_profile_has_required_fields/);
  });
});

describe("existing users keep working (backward compatibility)", () => {
  const me = async (token) => (await (await call("GET", "/api/users/me", { token })).json()).user;
  const put = (token, body) => call("PUT", "/api/users/me/profile", { token, body });
  // Simulates a row saved by the OLD app: free-text branch, completed profile.
  const completeLikeBefore = async (token, { batch, branch }) => {
    await call("GET", "/api/users/me", { token });
    await pool.query("UPDATE users SET batch = $2, branch = $3, profile_completed_at = now() WHERE firebase_uid = $1", [TOKENS[token].uid, batch, branch]);
  };

  test("a user finished under the old rules stays completed and keeps their stored batch and branch", async () => {
    await completeLikeBefore("alice", { batch: "B10", branch: "Computer Science" });
    const user = await me("alice");
    assert.equal(user.profileCompleted, true);
    assert.equal(user.profile.branch, "Computer Science"); // NOT overwritten by detection
    assert.equal(user.profile.academic.yearOfStudy, 2); // but Year of Study is available for them too
  });
  test("saving only a coding handle does not touch their stored branch, even though the form sends the same batch", async () => {
    await completeLikeBefore("alice", { batch: "B10", branch: "Computer Science" });
    const res = await put("alice", { batch: "B10", codeforcesHandle: "alice_cf" });
    assert.equal(res.status, 200);
    const { user } = await res.json();
    assert.equal(user.profile.branch, "Computer Science");
    assert.equal(user.profile.codeforcesHandle, "alice_cf");
  });
  test("an old user whose enrollment format is no longer recognised can still sign in, use the dashboard and save handles", async () => {
    await completeLikeBefore("legacy", { batch: "B10", branch: "CSE" });
    const user = await me("legacy");
    assert.equal(user.profileCompleted, true);
    assert.equal(user.profile.academic.yearOfStudy, null);
    assert.match(user.profile.academic.error, /kph\.jiit@gmail\.com/);
    const res = await put("legacy", { batch: "B10", leetcodeHandle: "legacy_lc" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.profile.leetcodeHandle, "legacy_lc");
  });
  test("an old user whose batch is not valid under the new rules keeps it until they change it", async () => {
    await completeLikeBefore("alice", { batch: "X-7", branch: "CSE" });
    assert.equal((await put("alice", { batch: "X-7", codeforcesHandle: "alice_cf" })).status, 200);
    assert.equal((await me("alice")).profile.batch, "X-7");
    assert.equal((await put("alice", { batch: "Q5" })).status, 400); // changing it goes through the new rules
    assert.equal((await me("alice")).profile.batch, "X-7");
  });
});

describe("contests and registration", () => {
  const SLUG = "encode-26-2";
  // batch per person: alice = campus 62, bob = campus 128, fresher = campus 62 (2026 intake)
  const BATCHES = { alice: "B10", bob: "F10", fresher: "B1", senior: "A2", staff: "B10" };
  const finishProfile = (token) =>
    call("PUT", "/api/users/me/profile", { token, body: { batch: BATCHES[token], ...(token === "staff" ? { enrollmentNo: "2401030007" } : {}) } });
  const register = (token, body = { hackerrankHandle: "alice_hr" }, slug = SLUG) =>
    call("POST", `/api/contests/${slug}/registrations`, { token, body });
  const registrations = async () => (await pool.query("SELECT * FROM contest_registrations")).rows;

  test("everything requires login", async () => {
    assert.equal((await call("GET", "/api/contests")).status, 401);
    assert.equal((await call("GET", `/api/contests/${SLUG}`)).status, 401);
    assert.equal((await call("POST", `/api/contests/${SLUG}/registrations`, { body: { hackerrankHandle: "z" } })).status, 401);
  });
  // "now" for a moment, then back to the normal fixed clock
  const atTime = async (iso, fn) => {
    nowValue = new Date(iso);
    try { return await fn(); } finally { nowValue = new Date(DEFAULT_NOW); }
  };
  const listed = async (token, slug = SLUG) => (await (await call("GET", "/api/contests", { token })).json()).contests.find((c) => c.slug === slug);

  test("the list has Encode 26.2 and Execute 26.4 with their schedules and registration states (soonest first)", async () => {
    const { contests } = await (await call("GET", "/api/contests", { token: "alice" })).json();
    const slugs = contests.map((c) => c.slug);
    assert.ok(slugs.indexOf("encode-26-2") < slugs.indexOf("execute-26-4"));

    const encode = contests.find((c) => c.slug === "encode-26-2");
    assert.equal(encode.title, "Encode 26.2");
    assert.equal(encode.venue, "CL1 & CL2");
    assert.match(encode.description, /individual competitive programming contest by Knuth Programming Hub/);
    assert.match(encode.description, /₹6,000/);
    // 14:00 / 16:00 / 14:15 Indian time on 24 Oct 2026 = 08:30 / 10:30 / 08:45 UTC
    assert.deepEqual([encode.startsAt, encode.endsAt, encode.registrationClosesAt], ["2026-10-24T08:30:00.000Z", "2026-10-24T10:30:00.000Z", "2026-10-24T08:45:00.000Z"]);
    assert.deepEqual([encode.registrationStatus, encode.registrationOpen, encode.registration], ["OPEN", true, null]);

    const execute = contests.find((c) => c.slug === "execute-26-4");
    assert.equal(execute.title, "Execute 26.4");
    assert.deepEqual([execute.startsAt, execute.endsAt, execute.registrationClosesAt], ["2026-10-31T08:30:00.000Z", "2026-10-31T10:30:00.000Z", null]);
    assert.deepEqual([execute.registrationStatus, execute.registrationOpen, execute.registration], ["SOON", false, null]);
  });
  test("the contest page data carries the same schedule and status", async () => {
    const { contest } = await (await call("GET", "/api/contests/execute-26-4", { token: "alice" })).json();
    assert.deepEqual([contest.registrationStatus, contest.endsAt], ["SOON", "2026-10-31T10:30:00.000Z"]);
  });
  test("unknown contest -> 404, also for slugs that cannot exist", async () => {
    assert.equal((await call("GET", "/api/contests/nope", { token: "alice" })).status, 404);
    assert.equal((await call("GET", "/api/contests/NOT%20A%20SLUG!", { token: "alice" })).status, 404);
    await finishProfile("alice");
    assert.equal((await register("alice", undefined, "nope")).status, 404);
  });
  test("registering before the profile is complete -> 409 and nothing is saved", async () => {
    const res = await register("alice");
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, "PROFILE_INCOMPLETE");
    assert.equal((await registrations()).length, 0);
  });
  test("registration needs only a HackerRank ID (there is no team name any more)", async () => {
    await finishProfile("alice");
    const res = await register("alice", { hackerrankHandle: "" });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.ok(error.fields.hackerrankHandle);
    assert.equal(error.fields.teamName, undefined);
    assert.equal((await register("alice", { hackerrankHandle: "<script>" })).status, 400);
    assert.equal((await register("alice", {})).status, 400);
    assert.equal((await registrations()).length, 0);
  });
  test("a good registration is saved, and the HackerRank ID is ALSO saved to the profile", async () => {
    await finishProfile("alice");
    assert.equal((await me("alice")).profile.hackerrankHandle, null);
    const res = await register("alice", { hackerrankHandle: "alice_hr" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.deepEqual(Object.keys(body.registration).sort(), ["createdAt", "hackerrankHandle", "id"]); // no teamName
    assert.equal(body.registration.hackerrankHandle, "alice_hr");
    assert.equal(body.user.profile.hackerrankHandle, "alice_hr"); // returned so the UI updates without a reload
    assert.equal(body.user.profile.academic.yearOfStudyLabel, "2nd Year"); // and the profile's Year of Study comes with it
    assert.equal((await me("alice")).profile.hackerrankHandle, "alice_hr"); // really stored in users
    const { contests } = await (await call("GET", "/api/contests", { token: "alice" })).json();
    const listed = contests.find((c) => c.slug === SLUG).registration;
    assert.equal(listed.hackerrankHandle, "alice_hr");
    assert.equal(listed.teamName, undefined);
    const detail = await (await call("GET", `/api/contests/${SLUG}`, { token: "alice" })).json();
    assert.equal(detail.registration.hackerrankHandle, "alice_hr");
    assert.equal(detail.registration.teamName, undefined);
  });
  test("a team name in the request is ignored and never stored", async () => {
    await finishProfile("alice");
    const res = await register("alice", { hackerrankHandle: "alice_hr", teamName: "Team Alpha", team_name: "Team Alpha" });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).registration.teamName, undefined);
    assert.equal((await registrations())[0].team_name, null);
  });
  test("the Year of Study is NOT stored on the registration: it follows the profile (here: after the July 20 rollover)", async () => {
    nowValue = new Date("2027-07-19T12:00:00+05:30"); // alice (admitted 2025) is in her 2nd year
    await finishProfile("alice");
    await register("alice");
    const columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contest_registrations'")).rows.map((r) => r.column_name);
    assert.ok(!columns.some((c) => /year/i.test(c)), `registration has a year column: ${columns}`);
    nowValue = new Date("2027-07-20T12:00:00+05:30");
    assert.equal((await me("alice")).profile.academic.yearOfStudyLabel, "3rd Year"); // the same registration, one rollover later
  });
  test("a client-supplied Year of Study that differs from the profile is refused, and nothing is saved", async () => {
    await finishProfile("alice"); // 2nd year
    for (const yearOfStudy of [1, 3, 4, "3", "3rd Year", "third", "1st Year", 99, null, "", {}, [], true]) {
      const res = await register("alice", { hackerrankHandle: "alice_hr", yearOfStudy });
      assert.equal(res.status, 400, `yearOfStudy ${JSON.stringify(yearOfStudy)}`);
      const { error } = await res.json();
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.ok(error.fields.yearOfStudy);
    }
    assert.equal((await registrations()).length, 0);
    assert.equal((await me("alice")).profile.hackerrankHandle, null); // the failed attempts did not touch the profile either
  });
  test("a client-supplied Year of Study that MATCHES the profile is accepted (and still comes from the profile)", async () => {
    await finishProfile("alice");
    assert.equal((await register("alice", { hackerrankHandle: "alice_hr", yearOfStudy: "2nd Year" })).status, 201);
    await finishProfile("fresher");
    assert.equal((await register("fresher", { hackerrankHandle: "fresh_hr", yearOfStudy: 1 })).status, 201);
  });
  test("everyone is judged by THEIR OWN profile: a first-year cannot register as a second-year and vice versa", async () => {
    await finishProfile("fresher"); // 1st year
    await finishProfile("alice"); // 2nd year
    assert.equal((await register("fresher", { hackerrankHandle: "f_hr", yearOfStudy: 2 })).status, 400);
    assert.equal((await register("alice", { hackerrankHandle: "a_hr", yearOfStudy: 1 })).status, 400);
    assert.equal((await register("fresher", { hackerrankHandle: "f_hr", yearOfStudy: 1 })).status, 201);
    assert.equal((await register("alice", { hackerrankHandle: "a_hr", yearOfStudy: 2 })).status, 201);
  });
  test("with no valid Year of Study on the profile the registration is refused, with the support address", async () => {
    // (a) an old user whose enrollment format is not recognised
    await call("GET", "/api/users/me", { token: "legacy" });
    await pool.query("UPDATE users SET batch = 'B10', branch = 'CSE', profile_completed_at = now() WHERE firebase_uid = 'uid-legacy'");
    let res = await register("legacy", { hackerrankHandle: "leg_hr" });
    assert.equal(res.status, 409);
    let { error } = await res.json();
    assert.equal(error.code, "YEAR_OF_STUDY_UNAVAILABLE");
    assert.match(error.message, /kph\.jiit@gmail\.com/);
    // (b) a student who has run past the 4-year programme on the calendar.
    // By August 2029 the Encode deadline (Oct 2026) is long past, so take the deadline away for this check:
    // it is about the Year of Study, not about the deadline. It is put back afterwards.
    await finishProfile("alice");
    await pool.query("UPDATE contests SET registration_closes_at = NULL WHERE slug = $1", [SLUG]);
    try {
      nowValue = new Date("2029-08-01T12:00:00+05:30");
      res = await register("alice");
      assert.equal(res.status, 409);
      ({ error } = await res.json());
      assert.equal(error.code, "YEAR_OF_STUDY_UNAVAILABLE");
      assert.equal((await registrations()).length, 0);
      assert.equal((await me("alice")).profile.hackerrankHandle, null);
    } finally {
      await pool.query("UPDATE contests SET registration_closes_at = '2026-10-24 14:15:00+05:30' WHERE slug = $1", [SLUG]);
    }
  });
  test("registering twice -> 409, and the failed attempt changes NOTHING (transaction rolled back)", async () => {
    await finishProfile("alice");
    await register("alice", { hackerrankHandle: "first_id" });
    const again = await register("alice", { hackerrankHandle: "second_id" });
    assert.equal(again.status, 409);
    assert.equal((await again.json()).error.code, "ALREADY_REGISTERED");
    assert.equal((await registrations()).length, 1);
    assert.equal((await me("alice")).profile.hackerrankHandle, "first_id"); // NOT overwritten by the failed attempt
  });
  test("10 simultaneous registrations by the same person create exactly one", async () => {
    await finishProfile("alice");
    const results = await Promise.all(Array.from({ length: 10 }, () => register("alice")));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(results.filter((r) => r.status === 409).length, 9);
    assert.equal((await registrations()).length, 1);
  });
  test("identity and profile details come from the server, never from the request body", async () => {
    await finishProfile("alice");
    await finishProfile("bob");
    const bobId = (await pool.query("SELECT id FROM users WHERE firebase_uid = 'uid-bob'")).rows[0].id;
    const res = await register("alice", { hackerrankHandle: "alice_hr", userId: bobId, user_id: bobId, batch: "Z99", branch: "ECE", enrollmentNo: "1", contestId: "x" });
    assert.equal(res.status, 201);
    const rows = await registrations();
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].user_id, bobId);
    const alice = await me("alice");
    assert.equal(alice.profile.batch, "B10");
    assert.equal(alice.profile.branch, "CSE");
  });
  test("students from both campuses register independently", async () => {
    await finishProfile("alice");
    await finishProfile("bob");
    assert.equal((await register("alice", { hackerrankHandle: "alice_hr" })).status, 201);
    assert.equal((await register("bob", { hackerrankHandle: "bob_hr" })).status, 201);
    assert.equal((await registrations()).length, 2);
    assert.equal((await me("bob")).profile.academic.campus, "128");
  });
  test("closed registration -> 409", async () => {
    await finishProfile("alice");
    await pool.query("UPDATE contests SET registration_status = 'CLOSED' WHERE slug = $1", [SLUG]);
    try {
      const res = await register("alice");
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error.code, "REGISTRATION_CLOSED");
      assert.equal((await listed("alice")).registrationStatus, "CLOSED");
    } finally {
      await pool.query("UPDATE contests SET registration_status = 'OPEN' WHERE slug = $1", [SLUG]);
    }
  });
  test("Encode 26.2 registration closes by itself at 14:15 on 24 Oct 2026, Indian time, to the second", async () => {
    await finishProfile("alice");
    await finishProfile("bob");
    await atTime("2026-10-24T14:14:59+05:30", async () => {
      assert.equal((await listed("alice")).registrationStatus, "OPEN");
      assert.equal((await register("alice")).status, 201);
    });
    await atTime("2026-10-24T14:15:00+05:30", async () => {
      assert.deepEqual([(await listed("bob")).registrationStatus, (await listed("bob")).registrationOpen], ["CLOSED", false]);
      const late = await register("bob", { hackerrankHandle: "bob_hr" });
      assert.equal(late.status, 409);
      assert.equal((await late.json()).error.code, "REGISTRATION_CLOSED");
    });
    assert.equal((await registrations()).length, 1); // only the on-time registration exists
    // after the deadline the person who registered still sees their registration
    await atTime("2026-10-25T09:00:00+05:30", async () => {
      const detail = await (await call("GET", `/api/contests/${SLUG}`, { token: "alice" })).json();
      assert.equal(detail.registration.hackerrankHandle, "alice_hr");
      assert.equal(detail.contest.registrationStatus, "CLOSED");
    });
  });
  test("a contest whose registration has not opened yet cannot be registered for, until an organizer opens it", async () => {
    await finishProfile("alice");
    const early = await register("alice", { hackerrankHandle: "alice_hr" }, "execute-26-4");
    assert.equal(early.status, 409);
    assert.equal((await early.json()).error.code, "REGISTRATION_NOT_OPEN");
    assert.equal((await registrations()).length, 0);
    await pool.query("UPDATE contests SET registration_status = 'OPEN' WHERE slug = 'execute-26-4'");
    try {
      assert.equal((await register("alice", { hackerrankHandle: "alice_hr" }, "execute-26-4")).status, 201);
    } finally {
      await pool.query("UPDATE contests SET registration_status = 'SOON' WHERE slug = 'execute-26-4'");
    }
  });
  test("the database refuses impossible schedules and unknown registration statuses", async () => {
    await assert.rejects(pool.query("UPDATE contests SET ends_at = starts_at - interval '1 hour' WHERE slug = $1", [SLUG]), /contest_ends_after_it_starts/);
    await assert.rejects(pool.query("UPDATE contests SET registration_closes_at = ends_at + interval '1 hour' WHERE slug = $1", [SLUG]), /registration_closes_before_the_end/);
    await assert.rejects(pool.query("UPDATE contests SET registration_status = 'MAYBE' WHERE slug = $1", [SLUG]), /violates check constraint/);
  });
  test("deleting a user row (as you do to re-test) also removes their registrations", async () => {
    await finishProfile("alice");
    await register("alice");
    assert.equal((await registrations()).length, 1);
    await pool.query("DELETE FROM users WHERE firebase_uid = 'uid-alice'");
    assert.equal((await registrations()).length, 0);
  });
  test("a contest that has registrations cannot be deleted by accident", async () => {
    await finishProfile("alice");
    await register("alice");
    await assert.rejects(pool.query("DELETE FROM contests WHERE slug = $1", [SLUG]), /violates foreign key/);
  });
});

describe("core team roster: CSV parsing", () => {
  const { parseCoreTeamCsv } = require("../src/utils/coreTeamCsv");
  test("reads the real file layout: comments, header, roles in any case, Windows line endings, BOM, trailing commas", () => {
    const text = "\uFEFF# private list\r\n# second comment\r\nenrollment_no,role\r\n2401030289,COORDINATOR\r\n 2501030069 , volunteer ,\r\n\r\n\"992501030399\",\"Volunteer\"\r\n";
    const { entries, errors } = parseCoreTeamCsv(text);
    assert.deepEqual(errors, []);
    assert.deepEqual(entries, [
      { enrollmentNo: "2401030289", role: "COORDINATOR" },
      { enrollmentNo: "2501030069", role: "VOLUNTEER" },
      { enrollmentNo: "992501030399", role: "VOLUNTEER" },
    ]);
  });
  test("reports EVERY problem with its line number, and still lists the good rows", () => {
    const { entries, errors } = parseCoreTeamCsv("enrollment_no,role\n2501030117,BOSS\n9.9E+11,VOLUNTEER\n123,VOLUNTEER\n2501030069,VOLUNTEER\n2501030069,COORDINATOR\n2501030018\n2501030016,VOLUNTEER,extra\n");
    assert.deepEqual(errors.map((e) => e.line), [2, 3, 4, 6, 7, 8]);
    assert.match(errors[0].message, /not a valid role/);
    assert.match(errors[1].message, /scientific notation/);
    assert.match(errors[3].message, /already listed on line 5/);
    assert.match(errors[4].message, /exactly 2 columns/);
    assert.deepEqual(entries, [{ enrollmentNo: "2501030069", role: "VOLUNTEER" }]);
  });
  test("a missing or wrong header, and an empty file, are errors", () => {
    assert.equal(parseCoreTeamCsv("2501030069,VOLUNTEER\n").errors[0].line, 1);
    assert.equal(parseCoreTeamCsv("enrollment,role\n").errors.length, 1);
    assert.equal(parseCoreTeamCsv("").errors.length, 1);
    assert.equal(parseCoreTeamCsv("# only comments\n").errors.length, 1);
  });
  test("enrollment numbers must follow the campus rules (10 digits for campus 62, 12 starting 99 for campus 128)", () => {
    const { entries, errors } = parseCoreTeamCsv("enrollment_no,role\n2501030069,VOLUNTEER\n992501030399,VOLUNTEER\n9921103001,VOLUNTEER\n25010300691,VOLUNTEER\nabc,VOLUNTEER\n");
    assert.equal(entries.length, 2);
    assert.deepEqual(errors.map((e) => e.line), [4, 5, 6]);
  });
});

describe("core team roster: database and import", () => {
  const { createCoreTeamService } = require("../src/services/coreTeamService");
  const importer = require("../scripts/import-core-team");
  const os = require("node:os");
  const fs = require("node:fs");
  const path = require("node:path");
  const roster = async () => Object.fromEntries((await pool.query("SELECT enrollment_no, role FROM core_team_members")).rows.map((r) => [r.enrollment_no, r.role]));
  const writeCsv = (text) => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kph-")), "core-team.csv");
    fs.writeFileSync(file, text);
    return file;
  };
  const quiet = () => {};

  test("the database refuses an unknown role or a malformed enrollment number", async () => {
    await assert.rejects(pool.query("INSERT INTO core_team_members VALUES ('2501030069', 'BOSS')"), /core_team_role_valid/);
    await assert.rejects(pool.query("INSERT INTO core_team_members VALUES ('abc', 'VOLUNTEER')"), /core_team_enrollment_format/);
    await assert.rejects(pool.query("INSERT INTO core_team_members VALUES (NULL, 'VOLUNTEER')"));
  });
  test("sync adds, changes and removes so the table matches the list exactly, and reports it", async () => {
    const svc = createCoreTeamService(pool);
    let r = await svc.sync([{ enrollmentNo: "2401030289", role: "COORDINATOR" }, { enrollmentNo: "2501030069", role: "VOLUNTEER" }]);
    assert.equal(r.added.length, 2);
    assert.deepEqual(await roster(), { 2401030289: "COORDINATOR", 2501030069: "VOLUNTEER" });
    r = await svc.sync([{ enrollmentNo: "2401030289", role: "VOLUNTEER" }, { enrollmentNo: "2501030069", role: "VOLUNTEER" }, { enrollmentNo: "992501030399", role: "VOLUNTEER" }]);
    assert.deepEqual(r.changed, [{ enrollmentNo: "2401030289", from: "COORDINATOR", to: "VOLUNTEER" }]);
    assert.deepEqual(r.added, [{ enrollmentNo: "992501030399", role: "VOLUNTEER" }]);
    assert.equal(r.unchanged, 1);
    r = await svc.sync([{ enrollmentNo: "2501030069", role: "VOLUNTEER" }]);
    assert.deepEqual(r.removed.map((x) => x.enrollmentNo).sort(), ["2401030289", "992501030399"]);
    assert.deepEqual(await roster(), { 2501030069: "VOLUNTEER" });
  });
  test("a dry run reports the same changes but writes nothing", async () => {
    const svc = createCoreTeamService(pool);
    await svc.sync([{ enrollmentNo: "2501030069", role: "VOLUNTEER" }]);
    const r = await svc.sync([{ enrollmentNo: "2501030069", role: "COORDINATOR" }, { enrollmentNo: "2401030289", role: "VOLUNTEER" }], { dryRun: true });
    assert.equal(r.added.length, 1);
    assert.equal(r.changed.length, 1);
    assert.deepEqual(await roster(), { 2501030069: "VOLUNTEER" });
  });
  test("the import script applies a CSV and is safe to run again", async () => {
    const file = writeCsv("# private\nenrollment_no,role\n2401030289,COORDINATOR\n2501030069,VOLUNTEER\n992501030399,VOLUNTEER\n");
    await importer.run(pool, [file], quiet);
    assert.deepEqual(await roster(), { 2401030289: "COORDINATOR", 2501030069: "VOLUNTEER", 992501030399: "VOLUNTEER" });
    const again = await importer.run(pool, [file], quiet);
    assert.deepEqual([again.added.length, again.changed.length, again.removed.length, again.unchanged], [0, 0, 0, 3]);
  });
  test("editing the CSV and importing again promotes, adds and removes people", async () => {
    await importer.run(pool, [writeCsv("enrollment_no,role\n2401030289,COORDINATOR\n2501030069,VOLUNTEER\n2501030117,VOLUNTEER\n")], quiet);
    await importer.run(pool, [writeCsv("enrollment_no,role\n2401030289,COORDINATOR\n2501030069,COORDINATOR\n992501030399,VOLUNTEER\n")], quiet);
    assert.deepEqual(await roster(), { 2401030289: "COORDINATOR", 2501030069: "COORDINATOR", 992501030399: "VOLUNTEER" });
  });
  test("a CSV with any error imports NOTHING", async () => {
    await importer.run(pool, [writeCsv("enrollment_no,role\n2501030069,VOLUNTEER\n")], quiet);
    await assert.rejects(importer.run(pool, [writeCsv("enrollment_no,role\n2401030289,COORDINATOR\n2501030117,BOSS\n")], quiet), /1 problem.*Nothing was imported/s);
    assert.deepEqual(await roster(), { 2501030069: "VOLUNTEER" });
  });
  test("--dry-run writes nothing; an empty list is refused unless --allow-empty", async () => {
    await importer.run(pool, [writeCsv("enrollment_no,role\n2501030069,VOLUNTEER\n")], quiet);
    await importer.run(pool, [writeCsv("enrollment_no,role\n2401030289,COORDINATOR\n"), "--dry-run"], quiet);
    assert.deepEqual(await roster(), { 2501030069: "VOLUNTEER" });
    const empty = writeCsv("enrollment_no,role\n");
    await assert.rejects(importer.run(pool, [empty], quiet), /would REMOVE all 1/);
    assert.deepEqual(await roster(), { 2501030069: "VOLUNTEER" });
    await importer.run(pool, [empty, "--allow-empty"], quiet);
    assert.deepEqual(await roster(), {});
  });
  test("a missing file or an unknown option is a clear error", async () => {
    await assert.rejects(importer.run(pool, ["/nope/missing.csv"], quiet), /File not found/);
    await assert.rejects(importer.run(pool, [writeCsv("enrollment_no,role\n"), "--force"], quiet), /Unknown option --force/);
  });
});

describe("core team roles in the API", () => {
  const me = async (token) => (await (await call("GET", "/api/users/me", { token })).json()).user;
  const put = (token, body) => call("PUT", "/api/users/me/profile", { token, body });
  const addToRoster = (enrollmentNo, role) => pool.query("INSERT INTO core_team_members (enrollment_no, role) VALUES ($1, $2)", [enrollmentNo, role]);

  test("someone not on the list is a plain student with no core team role", async () => {
    const user = await me("alice");
    assert.equal(user.role, "STUDENT");
    assert.equal(user.coreTeamRole, null);
  });
  test("a listed person is STILL a student, and additionally COORDINATOR or VOLUNTEER (both campuses)", async () => {
    await addToRoster("2501030001", "COORDINATOR"); // alice, campus 62
    await addToRoster("992501030002", "VOLUNTEER"); // bob, campus 128
    const alice = await me("alice");
    assert.equal(alice.role, "STUDENT");
    assert.equal(alice.coreTeamRole, "COORDINATOR");
    const bob = await me("bob");
    assert.equal(bob.role, "STUDENT");
    assert.equal(bob.coreTeamRole, "VOLUNTEER");
    assert.equal((await me("shrey")).coreTeamRole, null); // others unaffected
  });
  test("a person listed BEFORE they ever sign in gets the role on their first login", async () => {
    await addToRoster("2501030001", "VOLUNTEER");
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM users")).rows[0].n, 0);
    assert.equal((await me("alice")).coreTeamRole, "VOLUNTEER");
  });
  test("roster changes apply on the very next request, with no re-login and no user row rewritten", async () => {
    await me("alice");
    const before = (await pool.query("SELECT updated_at FROM users")).rows[0].updated_at.getTime();
    assert.equal((await me("alice")).coreTeamRole, null);
    await addToRoster("2501030001", "VOLUNTEER");
    assert.equal((await me("alice")).coreTeamRole, "VOLUNTEER");
    await pool.query("UPDATE core_team_members SET role = 'COORDINATOR'");
    assert.equal((await me("alice")).coreTeamRole, "COORDINATOR");
    await pool.query("DELETE FROM core_team_members");
    assert.equal((await me("alice")).coreTeamRole, null);
    assert.equal((await pool.query("SELECT updated_at FROM users")).rows[0].updated_at.getTime(), before);
  });
  test("the role survives onboarding and appears in every response that returns the user", async () => {
    await addToRoster("2501030001", "COORDINATOR");
    const saved = await (await put("alice", { batch: "B10", codeforcesHandle: "alice_cf" })).json();
    assert.equal(saved.user.coreTeamRole, "COORDINATOR");
    const reg = await (await call("POST", "/api/contests/encode-26-2/registrations", { token: "alice", body: { hackerrankHandle: "alice_hr" } })).json();
    assert.equal(reg.user.coreTeamRole, "COORDINATOR");
    assert.equal(reg.user.role, "STUDENT");
  });
  test("a client cannot grant itself a role: role / coreTeamRole in a request are ignored", async () => {
    await call("GET", "/api/users/me", { token: "alice" });
    await put("alice", { batch: "B10", codeforcesHandle: "alice_cf", role: "ADMIN", coreTeamRole: "COORDINATOR", isCoreTeam: true });
    const user = await me("alice");
    assert.equal(user.role, "STUDENT");
    assert.equal(user.coreTeamRole, null);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM core_team_members")).rows[0].n, 0);
  });
  test("TYPING a listed enrollment number does not grant the role: only the verified login email counts", async () => {
    await addToRoster("2401030007", "COORDINATOR");
    // prof.sharma@ and abc.xyz@ have no number in their email, so they type one at onboarding
    const saved = await put("staff", { batch: "B10", enrollmentNo: "2401030007", codeforcesHandle: "sneaky" });
    assert.equal(saved.status, 200);
    const staff = await me("staff");
    assert.equal(staff.profile.enrollmentNo, "2401030007"); // their profile says it...
    assert.equal(staff.coreTeamRole, null); // ...but it proves nothing, so no role
    assert.equal((await me("abc")).coreTeamRole, null);
    assert.equal(staff.role, "STUDENT");
  });
  test("the roster is never exposed: there is no endpoint that lists it, and /me shows only your own role", async () => {
    await addToRoster("2501030001", "COORDINATOR");
    await addToRoster("992501030002", "VOLUNTEER");
    const body = JSON.stringify(await me("shrey"));
    assert.ok(!body.includes("2501030001") && !body.includes("992501030002"));
    for (const route of ["/api/core-team", "/api/users", "/api/roles"]) assert.equal((await call("GET", route, { token: "alice" })).status, 404, route);
  });
});
