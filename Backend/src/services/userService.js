// The service layer holds the business rules and ALL the SQL for users.
// Controllers never write SQL and this file never touches req/res, so each can change independently.
const { HttpError } = require("../utils/HttpError");
const { enrollmentFromEmail } = require("../utils/enrollment");
const { describeAcademic, deriveAcademic, yearInputMatches } = require("../utils/academic");
const { SUPPORT_EMAIL } = require("../config/academic");
const { createCoreTeamService } = require("./coreTeamService");

// The only shape of a user the API ever returns (camelCase, no firebase_uid).
// `profile.academic` is DERIVED, never stored: campus, admission year and Year of Study come from the enrollment
// number and today's date (so Year of Study changes by itself on July 20), and `batchBranches` lists the batch
// letters this person may pick with the branch each one gives (the form uses it for instant feedback).
// `role` is the account role (everyone who signs in with an enrollment number is a STUDENT). `coreTeamRole` is
// separate and ADDITIONAL: "COORDINATOR" or "VOLUNTEER" if they are on the core team roster, otherwise null.
function toPublicUser(row, now = new Date(), coreTeamRole = null) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: row.role,
    coreTeamRole,
    profile: {
      enrollmentNo: row.enrollment_no,
      branch: row.branch,
      batch: row.batch,
      codeforcesHandle: row.codeforces_handle,
      leetcodeHandle: row.leetcode_handle,
      codechefHandle: row.codechef_handle,
      hackerrankHandle: row.hackerrank_handle,
      academic: describeAcademic(row.enrollment_no, now),
    },
    profileCompleted: row.profile_completed_at !== null,
    createdAt: row.created_at,
  };
}

// `now` is a function returning the current time. Tests pass a fixed one to check the July 20 rollover.
function createUserService(pool, { now = () => new Date(), coreTeam = createCoreTeamService(pool) } = {}) {
  async function findByFirebaseUid(uid) {
    const { rows } = await pool.query("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
    return rows[0] ?? null;
  }

  // First login creates the row; every later login just reads it.
  async function findOrCreateFromFirebase({ uid, email, displayName, photoUrl }) {
    const existing = await findByFirebaseUid(uid);
    if (existing) {
      // Keeps the stored name in step with the (cleaned) Google name. No write unless something changed.
      if (existing.display_name === displayName && existing.photo_url === photoUrl) return existing;
      const { rows } = await pool.query(
        "UPDATE users SET display_name = $2, photo_url = $3, updated_at = now() WHERE id = $1 RETURNING *",
        [existing.id, displayName, photoUrl],
      );
      return rows[0];
    }
    try {
      // ON CONFLICT DO NOTHING makes this safe if two requests from a brand-new user arrive at once:
      // the database lets exactly one INSERT win, so no duplicate users.
      const { rows } = await pool.query(
        `INSERT INTO users (firebase_uid, email, display_name, photo_url, enrollment_no)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (firebase_uid) DO NOTHING
         RETURNING *`,
        [uid, email, displayName, photoUrl, enrollmentFromEmail(email)],
      );
      return rows[0] ?? (await findByFirebaseUid(uid)); // we lost the race: read the winner's row
    } catch (error) {
      if (error.code === "23505") {
        // Same email already stored under a different Firebase uid.
        throw new HttpError(409, "ACCOUNT_CONFLICT", "An account with this email already exists. Please contact a club organizer.");
      }
      throw error;
    }
  }

  // Column names come from THIS map, never from the request, so the SQL below cannot be tampered with.
  const PROFILE_COLUMNS = {
    branch: "branch",
    batch: "batch",
    codeforcesHandle: "codeforces_handle",
    leetcodeHandle: "leetcode_handle",
    codechefHandle: "codechef_handle",
    hackerrankHandle: "hackerrank_handle",
  };

  // Updates only the fields present in `profile` (undefined = leave as it is, null = clear).
  // `db` can be a transaction client, so other services can run this inside their own transaction.
  async function updateProfile(userId, profile, db = pool) {
    const params = [userId, profile.enrollmentNo ?? null];
    const sets = ["enrollment_no = COALESCE(enrollment_no, $2)"]; // once known, the enrollment number never changes
    for (const [key, column] of Object.entries(PROFILE_COLUMNS)) {
      if (profile[key] === undefined) continue;
      params.push(profile[key]);
      sets.push(`${column} = $${params.length}`);
    }
    sets.push("profile_completed_at = COALESCE(profile_completed_at, now())", "updated_at = now()");
    try {
      const { rows } = await db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params);
      return rows[0];
    } catch (error) {
      if (error.code === "23505" && error.constraint === "users_enrollment_no_key") {
        throw new HttpError(409, "ENROLLMENT_TAKEN", "This enrollment number is already linked to another account.", {
          enrollmentNo: "Already linked to another account.",
        });
      }
      throw error;
    }
  }

  // Branch is NEVER taken from the client. This turns the validated form values into what may actually be saved:
  //  - first-time onboarding, or a changed batch: the enrollment number + batch are checked against the campus rules
  //    (utils/academic.js) and the branch is DERIVED from them; anything unknown or incompatible is a 400.
  //  - an unchanged batch on an already-completed profile: nothing academic is touched, so existing users keep
  //    their stored values (even older free-text ones) when they only add a coding handle.
  function prepareProfileUpdate(user, value) {
    const next = { ...value };
    const onboarding = !user.profile_completed_at;
    const batchChanged = value.batch !== undefined && value.batch !== user.batch;
    if (onboarding || batchChanged) {
      const enrollmentNo = user.enrollment_no ?? value.enrollmentNo;
      const result = deriveAcademic({ enrollmentNo, batch: value.batch, now: now() });
      if (!result.ok) throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", { [result.field]: result.message });
      next.batch = result.batch;
      next.branch = result.branch;
    } else {
      delete next.batch;
    }
    return next;
  }

  // What we know about a person's campus / Year of Study right now (used by contest registration).
  const academicOf = (row) => describeAcademic(row.enrollment_no, now());
  // The rule EVERY registration (contests, sessions...) applies to the person registering, in one place.
  // `me` is their saved user row. Registration is only for people with a finished profile and a valid Year of Study,
  // and a client may not claim a different Year of Study than the profile's: it is refused, not quietly ignored.
  function assertProfileReadyToRegister(me, claimedYearOfStudy) {
    if (!me?.profile_completed_at) throw new HttpError(409, "PROFILE_INCOMPLETE", "Please complete your profile before registering.");
    const { yearOfStudy, error } = academicOf(me);
    if (!yearOfStudy) {
      throw new HttpError(409, "YEAR_OF_STUDY_UNAVAILABLE", error || `We couldn’t work out your Year of Study. Contact ${SUPPORT_EMAIL}.`);
    }
    if (claimedYearOfStudy !== undefined && !yearInputMatches(claimedYearOfStudy, yearOfStudy)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", {
        yearOfStudy: "Year of Study comes from your profile and can’t be changed here.",
      });
    }
  }

  // Core team membership is looked up by the enrollment number in the person's VERIFIED login email, never by the
  // enrollment number stored on the profile: that one can be typed by users whose email has no number, so it proves nothing.
  const coreTeamRoleOf = (row) => coreTeam.roleFor(enrollmentFromEmail(row.email));
  const toPublic = async (row) => toPublicUser(row, now(), await coreTeamRoleOf(row));

  // Used when someone registers for a contest: their HackerRank ID is also saved to their profile.
  async function setHackerrankHandle(userId, handle, db = pool) {
    const { rows } = await db.query(
      "UPDATE users SET hackerrank_handle = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [userId, handle],
    );
    return rows[0];
  }

  return { findOrCreateFromFirebase, prepareProfileUpdate, updateProfile, setHackerrankHandle, academicOf, assertProfileReadyToRegister, coreTeamRoleOf, toPublic };
}

module.exports = { createUserService, toPublicUser };
