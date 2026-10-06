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
const TOKENS = {
  alice: { uid: "uid-alice", email: "9921103001@mail.jiit.ac.in", email_verified: true, name: "Alice A", firebase: google },
  bob: { uid: "uid-bob", email: "9921103002@mail.jiit.ac.in", email_verified: true, name: "Bob B", firebase: google },
  shrey: { uid: "uid-shrey", email: "2501030069@mail.jiit.ac.in", email_verified: true, name: "SHREYANSH SRIVASTAVA 2501030069", firebase: google },
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

let pool, server, base;
const call = (method, path, { token, body, headers = {} } = {}) =>
  fetch(base + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
// enrollmentNo is deliberately absent: for alice it comes from her email address.
const validProfile = { branch: "cse", batch: "b10", codeforcesHandle: "alice_cf", codechefHandle: "alice_cc", leetcodeHandle: "", hackerrankHandle: "  " };
const countUsers = async () => Number((await pool.query("SELECT count(*) FROM users")).rows[0].count);
const me = async (token) => (await (await call("GET", "/api/users/me", { token })).json()).user;

before(async () => {
  pool = createPool(url);
  await migrate(pool, () => {});
  server = createApp({ env, pool, verifyToken }).listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(async () => { server.close(); await pool.end(); });
beforeEach(() => pool.query("TRUNCATE users CASCADE")); // CASCADE also empties contest_registrations; contests (seeded by a migration) stay

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

describe("first login and onboarding data", () => {
  const me = async (token) => (await (await call("GET", "/api/users/me", { token })).json()).user;

  test("first login creates a STUDENT, takes the enrollment number from the email, profile incomplete", async () => {
    const res = await call("GET", "/api/users/me", { token: "alice" });
    assert.equal(res.status, 200);
    const { user } = await res.json();
    assert.equal(user.role, "STUDENT");
    assert.equal(user.displayName, "Alice A"); // name comes from the Google account
    assert.equal(user.profile.enrollmentNo, "9921103001");
    assert.equal(user.profile.branch, null);
    assert.equal(user.profileCompleted, false);
    assert.equal(user.firebase_uid, undefined); // internal fields never leave the server
    assert.equal(await countUsers(), 1);
  });
  test("the stored name is the cleaned Google name (no enrollment number, not shouting)", async () => {
    const user = await me("shrey");
    assert.equal(user.displayName, "Shreyansh Srivastava");
    assert.equal(user.profile.enrollmentNo, "2501030069");
  });
  test("the stored name follows later changes of the Google name", async () => {
    assert.equal((await me("alice")).displayName, "Alice A");
    TOKENS.alice.name = "ALICE RENAMED 9921103001";
    try {
      assert.equal((await me("alice")).displayName, "Alice Renamed");
      assert.equal((await pool.query("SELECT display_name FROM users")).rows[0].display_name, "Alice Renamed");
    } finally {
      TOKENS.alice.name = "Alice A";
    }
  });
  test("a staff-style address has no enrollment number yet", async () => {
    assert.equal((await me("staff")).profile.enrollmentNo, null);
  });
  test("5 simultaneous first requests still create exactly one user", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => call("GET", "/api/users/me", { token: "alice" })));
    assert.ok(results.every((r) => r.status === 200));
    assert.equal(await countUsers(), 1);
  });
  test("invalid profile -> 400 with per-field messages, nothing saved", async () => {
    const res = await call("PUT", "/api/users/me/profile", { token: "alice", body: { branch: "", codeforcesHandle: "a b" } });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.ok(error.fields.branch && error.fields.codeforcesHandle);
    assert.equal((await me("alice")).profileCompleted, false);
  });
  test("batch is required", async () => {
    const res = await call("PUT", "/api/users/me/profile", { token: "alice", body: { branch: "CSE", codechefHandle: "alice_cc" } });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error.fields.batch);
  });
  test("handles are optional: batch + branch alone complete the profile", async () => {
    const res = await call("PUT", "/api/users/me/profile", { token: "alice", body: { batch: "B10", branch: "CSE" } });
    assert.equal(res.status, 200);
    const { user } = await res.json();
    assert.equal(user.profileCompleted, true);
    assert.equal(user.profile.codeforcesHandle, null);
  });
  test("handles that are NOT sent stay as they are; handles sent empty are cleared", async () => {
    await call("PUT", "/api/users/me/profile", { token: "alice", body: { batch: "B10", branch: "CSE", codeforcesHandle: "alice_cf", codechefHandle: "alice_cc" } });
    // a later save that mentions no handles must not wipe them
    await call("PUT", "/api/users/me/profile", { token: "alice", body: { batch: "B11", branch: "CSE" } });
    let user = await me("alice");
    assert.equal(user.profile.batch, "B11");
    assert.equal(user.profile.codeforcesHandle, "alice_cf");
    // sending a handle as "" clears just that one
    await call("PUT", "/api/users/me/profile", { token: "alice", body: { batch: "B11", branch: "CSE", codeforcesHandle: "" } });
    user = await me("alice");
    assert.equal(user.profile.codeforcesHandle, null);
    assert.equal(user.profile.codechefHandle, "alice_cc");
  });
  test("a handle with bad characters is still rejected", async () => {
    const res = await call("PUT", "/api/users/me/profile", { token: "alice", body: { batch: "B10", branch: "CSE", leetcodeHandle: "no spaces allowed" } });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error.fields.leetcodeHandle);
  });
  test("valid profile is saved, normalised, and still there on the next login", async () => {
    const put = await call("PUT", "/api/users/me/profile", { token: "alice", body: validProfile });
    assert.equal(put.status, 200);
    assert.equal((await put.json()).user.profileCompleted, true);

    // "log in again" against a brand-new app instance (as after a server restart)
    const fresh = createApp({ env, pool, verifyToken }).listen(0);
    const again = await fetch(`http://localhost:${fresh.address().port}/api/users/me`, { headers: { Authorization: "Bearer alice" } });
    fresh.close();
    const { user } = await again.json();
    assert.equal(user.profileCompleted, true);
    assert.deepEqual(user.profile, {
      enrollmentNo: "9921103001", branch: "CSE", batch: "B10",
      codeforcesHandle: "alice_cf", leetcodeHandle: null, codechefHandle: "alice_cc", hackerrankHandle: null,
    });
  });
  test("a client cannot override an enrollment number that came from the email", async () => {
    await call("PUT", "/api/users/me/profile", { token: "alice", body: { ...validProfile, enrollmentNo: "1111111111" } });
    assert.equal((await me("alice")).profile.enrollmentNo, "9921103001");
  });
  test("a user whose email has no number must type it, and it is locked after saving", async () => {
    const missing = await call("PUT", "/api/users/me/profile", { token: "staff", body: validProfile });
    assert.equal(missing.status, 400);
    assert.ok((await missing.json()).error.fields.enrollmentNo);
    const saved = await call("PUT", "/api/users/me/profile", { token: "staff", body: { ...validProfile, enrollmentNo: "5500123" } });
    assert.equal(saved.status, 200);
    await call("PUT", "/api/users/me/profile", { token: "staff", body: { ...validProfile, enrollmentNo: "9999999" } });
    assert.equal((await me("staff")).profile.enrollmentNo, "5500123");
  });
  test("mass assignment: sending role/id/email is ignored", async () => {
    await call("PUT", "/api/users/me/profile", { token: "alice", body: { ...validProfile, role: "ADMIN", id: "x", email: "evil@x.com", profileCompleted: true } });
    const user = await me("alice");
    assert.equal(user.role, "STUDENT");
    assert.equal(user.email, TOKENS.alice.email);
  });
  test("typing someone else's enrollment number -> 409", async () => {
    await call("GET", "/api/users/me", { token: "alice" }); // alice owns 9921103001 via her email
    const res = await call("PUT", "/api/users/me/profile", { token: "staff", body: { ...validProfile, enrollmentNo: "9921103001" } });
    assert.equal(res.status, 409);
    assert.ok((await res.json()).error.fields.enrollmentNo);
  });
  test("the database itself rejects a 'completed' profile with missing data", async () => {
    await call("GET", "/api/users/me", { token: "alice" }); // enrollment set, branch + handles missing
    await assert.rejects(pool.query("UPDATE users SET profile_completed_at = now()"), /completed_profile_has_required_fields/);
  });
});

describe("contests and registration", () => {
  const SLUG = "encode-26-2";
  const finishProfile = (token) => call("PUT", "/api/users/me/profile", { token, body: { batch: "B10", branch: "CSE", ...(token === "staff" ? { enrollmentNo: "5500123" } : {}) } });
  const register = (token, body = { teamName: "Team Alpha", hackerrankHandle: "alice_hr" }, slug = SLUG) =>
    call("POST", `/api/contests/${slug}/registrations`, { token, body });
  const registrations = async () => (await pool.query("SELECT * FROM contest_registrations")).rows;

  test("everything requires login", async () => {
    assert.equal((await call("GET", "/api/contests")).status, 401);
    assert.equal((await call("GET", `/api/contests/${SLUG}`)).status, 401);
    assert.equal((await call("POST", `/api/contests/${SLUG}/registrations`, { body: { teamName: "X Y", hackerrankHandle: "z" } })).status, 401);
  });
  test("the list contains Encode 26.2, open for registration, not yet registered", async () => {
    const { contests } = await (await call("GET", "/api/contests", { token: "alice" })).json();
    const encode = contests.find((c) => c.slug === SLUG);
    assert.equal(encode.title, "Encode 26.2");
    assert.equal(encode.registrationOpen, true);
    assert.equal(encode.startsAt, null);
    assert.equal(encode.registration, null);
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
  test("registration needs a team name and a HackerRank ID", async () => {
    await finishProfile("alice");
    const res = await register("alice", { teamName: " ", hackerrankHandle: "" });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.ok(error.fields.teamName && error.fields.hackerrankHandle);
    assert.equal((await register("alice", { teamName: "<script>", hackerrankHandle: "ok_id" })).status, 400);
    assert.equal((await registrations()).length, 0);
  });
  test("a good registration is saved, and the HackerRank ID is ALSO saved to the profile", async () => {
    await finishProfile("alice");
    assert.equal((await me("alice")).profile.hackerrankHandle, null);
    const res = await register("alice", { teamName: "  Team    Alpha ", hackerrankHandle: "alice_hr" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.registration.teamName, "Team Alpha"); // spaces tidied
    assert.equal(body.user.profile.hackerrankHandle, "alice_hr"); // returned so the UI updates without a reload
    assert.equal((await me("alice")).profile.hackerrankHandle, "alice_hr"); // really stored in users
    const { contests } = await (await call("GET", "/api/contests", { token: "alice" })).json();
    assert.equal(contests.find((c) => c.slug === SLUG).registration.teamName, "Team Alpha");
    const detail = await (await call("GET", `/api/contests/${SLUG}`, { token: "alice" })).json();
    assert.equal(detail.registration.hackerrankHandle, "alice_hr");
  });
  test("registering twice -> 409, and the failed attempt changes NOTHING (transaction rolled back)", async () => {
    await finishProfile("alice");
    await register("alice", { teamName: "Team Alpha", hackerrankHandle: "first_id" });
    const again = await register("alice", { teamName: "Another Team", hackerrankHandle: "second_id" });
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
    const res = await register("alice", { teamName: "Team Alpha", hackerrankHandle: "alice_hr", userId: bobId, user_id: bobId, batch: "Z99", enrollmentNo: "1", contestId: "x" });
    assert.equal(res.status, 201);
    const rows = await registrations();
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].user_id, bobId);
    assert.equal((await me("alice")).profile.batch, "B10");
  });
  test("teammates may register with the same team name", async () => {
    await finishProfile("alice");
    await finishProfile("bob");
    assert.equal((await register("alice", { teamName: "Team Alpha", hackerrankHandle: "alice_hr" })).status, 201);
    assert.equal((await register("bob", { teamName: "team alpha", hackerrankHandle: "bob_hr" })).status, 201);
    assert.equal((await registrations()).length, 2);
  });
  test("closed registration -> 409", async () => {
    await finishProfile("alice");
    await pool.query("UPDATE contests SET registration_open = false WHERE slug = $1", [SLUG]);
    try {
      const res = await register("alice");
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error.code, "REGISTRATION_CLOSED");
    } finally {
      await pool.query("UPDATE contests SET registration_open = true WHERE slug = $1", [SLUG]);
    }
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
